# Checklist do dia da publicação

Sequência para publicar API e site juntos, sem que os convidados vejam erros. O site só fica no
domínio público depois que a API passou nos testes no ambiente real. Tempo estimado: 1 a 2 horas.

Legenda: **[você]** ação no navegador; **[agente]** executado pelo agente com `gh`; **[auto]** feito
pelos workflows ou pelo template.

## Antes de começar

- [ ] **[agente]** `main` com a CI verde e o workflow "Publish backend image" concluído para o
  último commit (imagem `ghcr.io/tobiasfkk/wedding-backend:<sha>` pública).
- [ ] **[agente]** Ensaio local na `main`: `infrastructure/production/rehearsal/run-rehearsal.sh`.

## 1. Conta AWS

- [ ] **[você]** Criar a conta no plano **Free** e ativar MFA no usuário raiz.
- [ ] **[você]** No canto superior direito do console, selecionar a região
  **América do Sul (São Paulo) `sa-east-1`**.
- [ ] **[você]** Opcional: no painel inicial do plano Free, concluir as atividades que liberam
  créditos extras.

## 2. Infraestrutura (um comando)

- [ ] **[você]** Abrir o **CloudShell** (ícone `>_` no topo do console, já em `sa-east-1`) e colar,
  trocando os dois e-mails:

```bash
curl -fsSLO https://raw.githubusercontent.com/tobiasfkk/wedding_platform/main/infrastructure/aws/wedding-stack.yaml
aws cloudformation deploy \
  --stack-name wedding-production \
  --template-file wedding-stack.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AlertEmail=SEU_EMAIL AdminEmail=EMAIL_DO_ADMIN
aws cloudformation describe-stacks --stack-name wedding-production \
  --query 'Stacks[0].Outputs' --output table
```

- [ ] **[você]** Enviar ao agente a tabela final (`InstanceId`, `PublicIp`, `GitHubDeployRoleArn`).
  Nenhum desses valores é segredo.
- [ ] **[auto]** A instância se prepara sozinha em ~5 minutos (Docker, Compose, swap, backup diário
  e segredos no Parameter Store). Log: `/var/log/wedding-bootstrap.log`.

Para usar a `t4g.micro`, acrescente `InstanceType=t4g.micro` ao `--parameter-overrides`. Se o
CloudShell não abrir em São Paulo, abra-o em outra região e acrescente `--region sa-east-1` aos dois
comandos `aws`.

## 3. GitHub e DNS da API

- [ ] **[agente]** Criar/atualizar o environment `production` com as variáveis `AWS_REGION`,
  `AWS_INSTANCE_ID`, `AWS_DEPLOY_ROLE_ARN` e `ADMIN_EMAIL`.
- [ ] **[você]** Cloudflare > `tobiaskiefer.com.br` > DNS > Add record:
  tipo `A`, nome `api.casamentodudatobi`, IPv4 = `PublicIp`, **Proxy status: DNS only** (nuvem
  cinza). Nenhum registro para `casamentodudatobi` ainda.

## 4. API no ar (site ainda fora do domínio público)

- [ ] **[agente]** Rodar "Deploy backend". Ele exige CI verde e imagem pública, publica pela SSM,
  aguarda o certificado HTTPS e valida pela internet: `/api/public/pix` 200, `/actuator` 404 e
  CORS só para o site.

Se falhar aqui, nada está público. Corrigir e repetir.

## 5. Site no ar

- [ ] **[agente]** Rodar "Deploy frontend". Ele substitui o deploy de produção antigo do Pages
  (`5e6bc3a6`, que publicava a raiz do repositório) pelo build testado.
- [ ] **[você]** Cloudflare > Workers & Pages > `wedding-platform` > Deployments: apagar o deploy
  `5e6bc3a6` (agora inativo).
- [ ] **[você]** `wedding-platform` > Custom domains > Set up a custom domain:
  `casamentodudatobi.tobiaskiefer.com.br`. O Cloudflare cria o registro DNS e o certificado; aguarde
  o status **Active**.

## 6. Testes no ambiente real

- [ ] **[agente]** Rodar "Production smoke tests" com escopo **full** (Chromium, Safari/iPhone e
  Android: jornada completa e verificação de nenhum erro). Cria dados de teste.
- [ ] **[você]** EC2 > Instances > `wedding-production` > Connect > **Session Manager** > Connect, e
  executar:

```bash
sudo /opt/wedding/scripts/reset-before-launch.sh
```

  Digitar `APAGAR`. O banco volta vazio e o ambiente fica travado como publicado.
- [ ] **[agente]** Rodar "Production smoke tests" com escopo **readonly**.

Se falhar no passo 6: remover o domínio personalizado do Pages tira o site do ar em minutos.

## 7. Uso real

- [ ] **[você]** Senha do admin: Systems Manager > Parameter Store >
  `/wedding/production/admin-password` > Show decrypted value.
- [ ] **[você]** Entrar em `https://casamentodudatobi.tobiaskiefer.com.br/admin`, configurar Pix e
  prazo do RSVP, cadastrar convidados e convites e enviar os links.
- [ ] **[você]** Opcional: monitor gratuito (UptimeRobot) em
  `https://api.casamentodudatobi.tobiaskiefer.com.br/api/public/pix`.
- [ ] **[você]** Acompanhar os créditos em Billing uma vez por semana; os alertas do AWS Budgets
  chegam por e-mail a 50% e 80% do limite mensal e na previsão de 100%.

## Depois do casamento

Para encerrar os custos: exportar os dados que quiser guardar, desligar a proteção contra
exclusão da instância (EC2 > Actions > Instance settings > Change termination protection), excluir
a stack `wedding-production` no CloudFormation e, por fim, esvaziar e excluir o bucket de backups e
os parâmetros `/wedding/production/*`, que são preservados de propósito.

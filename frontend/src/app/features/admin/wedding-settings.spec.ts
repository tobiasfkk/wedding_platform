import { FormControl, FormGroup } from '@angular/forms';

import { deadlineNotAfterEvent } from './wedding-settings';

describe('deadlineNotAfterEvent', () => {
  it('rejects an RSVP deadline after the wedding', () => {
    const form = new FormGroup({
      eventDate: new FormControl('2027-05-08'),
      eventTime: new FormControl('16:00'),
      rsvpDeadlineDate: new FormControl('2027-05-09'),
      rsvpDeadlineTime: new FormControl('10:00'),
    });
    expect(deadlineNotAfterEvent(form)).toEqual({ deadlineAfterEvent: true });
  });

  it('accepts an RSVP deadline before the wedding', () => {
    const form = new FormGroup({
      eventDate: new FormControl('2027-05-08'),
      eventTime: new FormControl('16:00'),
      rsvpDeadlineDate: new FormControl('2027-04-08'),
      rsvpDeadlineTime: new FormControl('23:59'),
    });
    expect(deadlineNotAfterEvent(form)).toBeNull();
  });
});

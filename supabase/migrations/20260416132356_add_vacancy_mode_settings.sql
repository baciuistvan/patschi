/*
  # Add Vacancy Mode Settings

  ## Summary
  Adds two new settings to support a "vacancy mode" for the reservation widget.

  ## New Settings Keys
  - `widget_vacancy_mode` (boolean string): When 'true', the public reservation widget
    shows a custom off-season message instead of the booking form.
  - `widget_vacancy_message` (text): The custom message admins write for guests when
    vacancy mode is active. Falls back to a default German message if empty.

  ## Notes
  - These settings follow the same key-value pattern as all existing settings
  - Default value for vacancy_mode is 'false' (booking form shown normally)
  - Default message is an empty string; the widget handles the fallback message
*/

INSERT INTO settings (key, value)
VALUES ('widget_vacancy_mode', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('widget_vacancy_message', '')
ON CONFLICT (key) DO NOTHING;

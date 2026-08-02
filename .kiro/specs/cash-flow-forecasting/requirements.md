# Requirements Document

## Introduction

A small business cash flow forecasting web application that allows business owners to import transaction data via CSV, manually enter transactions, automatically classify inflows and outflows, detect recurring transactions from history, and generate a forward-looking cash flow projection for the next 30, 60, or 90 days. The application targets a single operating account and is designed to be deployable to Vercel/Netlify/Railway and runnable locally.

## Glossary

- **System**: The cash flow forecasting web application.
- **User**: A small business owner using the application.
- **Transaction**: A financial event with a date, description, and amount (positive = inflow, negative = outflow).
- **CSV_Importer**: The component that parses and ingests uploaded CSV files.
- **Transaction_Store**: The component responsible for persisting and retrieving all transactions.
- **Classifier**: The component that determines whether a transaction is an inflow or outflow.
- **Recurrence_Detector**: The component that analyzes transaction history and identifies recurring transactions.
- **Forecast_Engine**: The component that projects future cash flow based on historical and recurring transactions plus manually added entries.
- **Inflow**: A transaction representing money received (positive amount).
- **Outflow**: A transaction representing money spent (negative amount).
- **Recurring Transaction**: A transaction that occurs at a regular interval (weekly, biweekly, or monthly) with the same or similar payee/description and amount.
- **Projection Window**: The number of days forward the forecast covers — 30, 60, or 90 days.
- **Running Balance**: The cumulative cash position at each point in a projection timeline.

---

## Requirements

### Requirement 1: CSV Transaction Import

**User Story:** As a business owner, I want to upload a CSV file of my transactions, so that I can quickly load my transaction history without manual entry.

#### Acceptance Criteria

1. WHEN a User uploads a CSV file, THE CSV_Importer SHALL parse each row into a Transaction with a date, a description of at most 255 characters, and an amount as a decimal number.
2. WHEN a CSV file contains a header row as its first row, THE CSV_Importer SHALL skip that first row and treat all subsequent rows as transaction data.
3. WHEN a CSV row is missing a required field (date, description, or amount), THE CSV_Importer SHALL skip that row and record the row number and the name of the missing field in a validation summary.
4. WHEN a CSV row contains an amount that cannot be parsed as a decimal number, THE CSV_Importer SHALL skip that row and include the row number with reason "unparseable amount" in the validation summary.
5. WHEN a CSV row contains a date that cannot be parsed as a valid ISO 8601 date (YYYY-MM-DD), THE CSV_Importer SHALL skip that row and include the row number with reason "unparseable date" in the validation summary.
6. WHEN a CSV file contains zero valid rows after parsing, THE CSV_Importer SHALL display an error message stating no valid transactions were found and SHALL NOT store any data in the Transaction_Store.
7. WHEN CSV parsing completes with at least one valid row, THE CSV_Importer SHALL store all valid transactions in the Transaction_Store and display separately the count of successfully imported rows and the count of skipped rows.
8. THE CSV_Importer SHALL accept CSV files where inflow amounts are represented as positive decimal numbers and outflow amounts are represented as negative decimal numbers (prefixed with "-").
9. WHEN a User uploads a CSV file exceeding 10,000 rows or 10 MB in size, THE CSV_Importer SHALL reject the file and display an error message stating the file exceeds the maximum allowed size.
10. WHEN a User uploads a file that is not a CSV file (i.e., does not have a .csv extension or does not contain comma-separated text), THE CSV_Importer SHALL reject the file and display an error message stating only CSV files are accepted.

---

### Requirement 2: Manual Transaction Entry

**User Story:** As a business owner, I want to manually add individual transactions, so that I can include future or one-off items not captured in my CSV history.

#### Acceptance Criteria

1. WHEN a User submits a manual transaction form with a valid date, description, amount, and recurrence setting, THE System SHALL store the transaction in the Transaction_Store within 2 seconds.
2. WHEN a User submits a manual transaction form with a missing or empty required field, THE System SHALL display a field-level validation error indicating which field is missing and SHALL NOT store any data in the Transaction_Store.
3. WHEN a User enters an amount that is not a number or is outside the range 0.00 to 999,999,999.99, THE System SHALL display a field-level validation error on the amount field and SHALL NOT store any data.
4. WHEN a User enters a date that is not a valid calendar date, THE System SHALL display a field-level validation error on the date field and SHALL NOT store any data.
5. WHEN a User enters a description longer than 255 characters, THE System SHALL display a field-level validation error on the description field and SHALL NOT store any data.
6. WHEN a User enters a manual transaction with recurrence set to "one-time", THE Transaction_Store SHALL store it as a single non-recurring transaction.
7. WHEN a User enters a manual transaction with recurrence set to "weekly", "biweekly", or "monthly", THE Transaction_Store SHALL store the transaction with its recurrence interval so the Forecast_Engine can project future occurrences.
8. WHEN a User successfully adds a manual transaction, THE System SHALL display a confirmation message and a refreshed transaction list together within 2 seconds of submission.

---

### Requirement 3: Inflow/Outflow Classification

**User Story:** As a business owner, I want my transactions automatically classified as inflows or outflows, so that I can quickly understand my cash position without labeling each item manually.

#### Acceptance Criteria

1. WHEN a Transaction is stored with a positive amount, THE Classifier SHALL assign it the classification "inflow".
2. WHEN a Transaction is stored with a negative amount, THE Classifier SHALL assign it the classification "outflow".
3. WHEN a Transaction is stored with an amount of zero, THE Classifier SHALL assign it the classification "unclassified" and flag it for User review.
4. WHEN a User overrides the classification of a Transaction to either "inflow" or "outflow", THE Transaction_Store SHALL persist the override with a timestamp and THE Classifier SHALL not revert it on subsequent operations.
5. THE System SHALL display each transaction's classification alongside its date, description, and amount in the transaction list.
6. WHEN a Transaction is stored with a missing or non-numeric amount, THE Classifier SHALL assign it the classification "unclassified" and flag it for User review.
7. WHEN a User attempts to override a transaction's classification with a value other than "inflow" or "outflow", THE System SHALL reject the override and display a validation error.
8. WHEN a Transaction is stored, THE System SHALL verify that the assigned classification is consistent with the amount sign (positive amounts classified as "inflow", negative amounts classified as "outflow") and SHALL reject storage with an error if the classification does not match the amount sign.

---

### Requirement 4: Recurring Transaction Detection

**User Story:** As a business owner, I want the app to automatically identify recurring transactions in my import history, so that I know which expenses and income are predictable.

#### Acceptance Criteria

1. WHEN the Transaction_Store contains at least 2 transactions with matching descriptions (case-insensitive, ignoring leading and trailing whitespace) and amounts within 1% of the larger amount, THE Recurrence_Detector SHALL analyze them for a weekly (7 ± 1 days), biweekly (14 ± 1 days), or monthly (28–31 days) interval pattern.
2. WHEN the Recurrence_Detector identifies a transaction group matching a regular interval with at least 2 occurrences, THE System SHALL flag those transactions as recurring and display the detected interval (weekly, biweekly, or monthly).
3. THE System SHALL display recurring transactions with a distinct visual indicator that differentiates them from one-off transactions in the transaction list.
4. WHEN a User confirms a recurring flag, THE Transaction_Store SHALL persist the confirmed status and THE Forecast_Engine SHALL include the transaction group in future projections.
5. WHEN a User dismisses a recurring flag, THE Transaction_Store SHALL persist the dismissal across sessions and THE Recurrence_Detector SHALL exclude that transaction group from all future detection runs.
6. WHEN a User reviews a transaction flagged as recurring, THE System SHALL allow the User to confirm or dismiss the recurring flag.
7. THE Recurrence_Detector SHALL treat description matching as case-insensitive and SHALL ignore leading and trailing whitespace when comparing descriptions.
8. IF the Recurrence_Detector encounters fewer than 2 transactions in any candidate group or cannot determine an interval pattern, THEN THE System SHALL leave those transactions unflaged and SHALL NOT modify any existing transaction state.

---

### Requirement 5: Cash Flow Forecast

**User Story:** As a business owner, I want to see a forward-looking cash flow projection, so that I can anticipate my future cash position and plan accordingly.

#### Acceptance Criteria

1. WHEN a User selects a Projection Window of 30, 60, or 90 days, THE Forecast_Engine SHALL generate a daily Running Balance projection for each calendar day from the current date through the last day of the window, inclusive.
2. THE Forecast_Engine SHALL include all confirmed recurring transactions (imported and manually added) in the projection, extrapolating future occurrences based on their detected or specified interval up to and including the last day of the selected Projection Window.
3. THE Forecast_Engine SHALL include all manually added one-time future transactions whose date falls on or before the last day of the selected Projection Window.
4. THE Forecast_Engine SHALL calculate the Running Balance for each day as the prior day's Running Balance plus the sum of all inflow amounts minus the sum of all outflow amounts projected for that day.
5. WHEN the Transaction_Store contains no historical transactions, THE Forecast_Engine SHALL generate a projection starting from a Running Balance of zero.
6. THE System SHALL display the forecast as a line chart with dates on the horizontal axis and currency amount on the vertical axis, showing Running Balance over time for the selected Projection Window.
7. THE System SHALL display a summary table alongside the chart showing each projected transaction sorted ascending by date, with columns for date, description, amount, classification, and cumulative Running Balance.
8. WHEN the projected Running Balance falls below zero on any day within the Projection Window, THE System SHALL highlight the contiguous date ranges where the balance is negative using a distinct visual indicator in both the chart and the summary table.
9. WHEN a User changes the Projection Window selection, THE Forecast_Engine SHALL regenerate the projection and update both the chart and the summary table within 1 second from the selection change.
10. IF the Forecast_Engine encounters an error while generating the projection, THEN THE System SHALL preserve the previously displayed projection unchanged; THE System SHALL also attempt to display an error message, but projection preservation SHALL occur regardless of whether the error message is successfully displayed.

---

### Requirement 6: Transaction Management

**User Story:** As a business owner, I want to view, edit, and delete transactions I've imported or entered, so that I can keep my data accurate.

#### Acceptance Criteria

1. THE System SHALL display all stored transactions in a sortable list ordered by date descending by default, showing up to 500 transactions per page.
2. WHEN a User selects a transaction for editing, THE System SHALL pre-populate the edit form with the transaction's existing date, description, amount, classification, and recurrence setting within 1 second.
3. WHEN a User submits an edited transaction with valid field values, THE Transaction_Store SHALL update the transaction and THE System SHALL reflect the change in the transaction list and forecast within 2 seconds.
4. WHEN a User submits an edited transaction with an invalid field value, THE System SHALL display a field-level validation error indicating which field is invalid and the reason, and SHALL prevent the update.
5. IF a User deletes a transaction, THEN THE System SHALL display a confirmation prompt identifying the transaction by its date and description before removing it from the Transaction_Store.
6. IF a User confirms deletion, THEN THE Transaction_Store SHALL remove the transaction and THE System SHALL remove it from the transaction list and refresh the forecast within 2 seconds.
7. WHEN the User sorts the transaction list by a column (date, description, amount, or classification), THE System SHALL re-order the list by the selected column within 1 second.
8. WHEN a User edits a transaction's amount, THE System SHALL accept amounts in the range 0.00 to 999,999,999.99 and SHALL reject amounts outside this range, displaying a field-level validation error.
9. WHEN a User cancels a deletion confirmation, THE System SHALL close the confirmation prompt and leave the transaction unchanged in the Transaction_Store.

---

### Requirement 7: Data Persistence

**User Story:** As a business owner, I want my transaction data to persist between sessions, so that I don't have to re-import or re-enter data every time I use the app.

#### Acceptance Criteria

1. THE Transaction_Store SHALL persist all transaction data to browser local storage within 500 milliseconds of any transaction being added, modified, or deleted, so that data survives page reloads.
2. WHEN the application loads, THE System SHALL read all previously stored transactions from local storage and restore the transaction list and forecast within 2 seconds.
3. IF local storage data is corrupted or cannot be parsed in any way, THEN THE System SHALL always initialize to a fully empty transaction state without attempting partial data recovery, and SHALL display an error message informing the User that stored data could not be loaded.
4. THE System SHALL provide a "Clear All Data" option that removes all transactions from the Transaction_Store and resets the application to its initial state.
5. WHEN a User selects "Clear All Data", THE System SHALL display a confirmation prompt before clearing the Transaction_Store.
6. WHEN a User confirms "Clear All Data" after having explicitly selected the "Clear All Data" option from the application interface, THE Transaction_Store SHALL remove all transactions from local storage and THE System SHALL reset to an empty transaction list and initial forecast state.

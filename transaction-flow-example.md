# Transaction Flow Example: Renewing Driving License

This document demonstrates how the new transaction flow system works with the example of renewing a driving license.

## Transaction Flow Configuration

**Transaction Name:** Renewing Driving License  
**Prefix:** RDL  
**Description:** Complete process for renewing a driving license

## Steps Configuration:

### Step 1: Get Queue Number
- **Window:** Not assigned (initial step)
- **Description:** Initial queue number assignment

### Step 2: Pass the necessary Documents
- **Window:** Window 1 - [Window User Name]
- **Description:** Submit required documents for license renewal

### Step 3: Take A Picture, Biometrics, and Signature
- **Window:** Window 2 - [Window User Name]
- **Description:** Capture photo, biometrics, and signature for new license

### Step 4: Pay the Renewing Fee and Claim the Driving License
- **Window:** Window 3 - [Window User Name]
- **Description:** Process payment and release the renewed driving license

## How It Works:

1. **Window Integration**: The system fetches all active window users from UserManagement
2. **Step Assignment**: Each transaction step can be assigned to a specific window
3. **Queue Flow**: Customers follow the defined sequence of windows
4. **Prefix System**: All queue numbers for this transaction will have prefix "RDL"

## API Endpoints Used:

- `GET /api/users/window-users` - Fetches available windows
- `GET /api/admin/transaction-flows` - Lists all transaction flows
- `POST /api/admin/transaction-flow` - Creates new transaction flow
- `PUT /api/admin/transaction-flow/:id` - Updates existing flow
- `DELETE /api/admin/transaction-flow/:id` - Deletes transaction flow

## Benefits:

- **Flexible**: Easy to create different transaction flows for various services
- **Window Management**: Automatically integrates with window users from UserManagement
- **Sequential Processing**: Ensures customers follow the correct order
- **Scalable**: Can handle multiple transaction types simultaneously

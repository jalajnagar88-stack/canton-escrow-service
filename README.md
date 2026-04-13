# Canton Escrow Service

[![CI](https://github.com/digital-asset/canton-escrow-service/actions/workflows/ci.yml/badge.svg)](https://github.com/digital-asset/canton-escrow-service/actions/workflows/ci.yml)

A secure, private, multi-party escrow service for on-chain commerce, built with Daml smart contracts for the Canton Network.

## Overview

This project provides a robust and secure escrow service that enables safe transactions between two parties (a buyer and a seller) by holding funds with a neutral third-party escrow agent until predefined conditions are met.

Leveraging Canton's privacy model, the details of each escrow agreement are only visible to the involved parties (Buyer, Seller, and Escrow Agent), ensuring commercial confidentiality. Daml's atomic transaction guarantees ensure that all steps of the escrow process, such as payment release and contract archival, happen simultaneously or not at all, eliminating settlement risk.

### Features

-   **Multi-Party Agreement:** Requires explicit agreement from Buyer, Seller, and Escrow Agent to establish the contract.
-   **Secure Fund Holding:** Funds are locked in the contract until conditions for release or refund are met.
-   **Conditional Release:** Payment is released to the Seller only after the Buyer confirms delivery.
-   **Built-in Dispute Resolution:** A clear mechanism for the Escrow Agent to mediate and resolve disputes.
-   **Private by Design:** Contract details are kept confidential to the stakeholders.
-   **Atomic Settlement:** Canton guarantees that complex multi-step actions are always all-or-nothing.

## Escrow Workflow

The core workflow is designed to be simple and secure. For detailed sequence diagrams, see [`docs/ESCROW_FLOWS.md`](./docs/ESCROW_FLOWS.md).

1.  **Request:** A Buyer or Seller initiates an `EscrowRequest`, detailing the terms, price, and designated Escrow Agent.
2.  **Agreement:** All three parties (Buyer, Seller, Agent) must agree to the terms to create the active `EscrowContract`.
3.  **Deposit:** The Buyer deposits the required funds into the contract. (Note: This typically involves an atomic Delivery-vs-Payment (DVP) with a Canton-native token).
4.  **Delivery:** The Seller provides the goods or services as agreed.
5.  **Confirmation:** The Buyer confirms satisfactory delivery.
6.  **Resolution:**
    -   **Happy Path:** Upon confirmation, the Escrow Agent releases the funds to the Seller.
    -   **Dispute:** If there's a disagreement, either party can initiate a dispute. The Escrow Agent then investigates and resolves the dispute by either releasing funds to the Seller or refunding them to the Buyer.

## Getting Started

### Prerequisites

-   [DPM (Daml Package Manager) v3.4.0 or later](https://docs.digitalasset.com/dpm/getting-started/install-sdk)
-   [Node.js v18+](https://nodejs.org/) and npm

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/digital-asset/canton-escrow-service.git
    cd canton-escrow-service
    ```

2.  **Build the Daml models:**
    This command compiles the Daml code into a DAR (Daml Archive) file.
    ```bash
    dpm build
    ```

3.  **Start a local Canton ledger:**
    This command starts a sandbox Canton environment and exposes the JSON API on port 7575.
    ```bash
    dpm sandbox
    ```

4.  **Install frontend dependencies and run the UI:**
    In a new terminal:
    ```bash
    cd frontend
    npm install
    npm start
    ```
    The sample UI will be available at `http://localhost:3000`.

## Integration via JSON API

You can integrate the escrow service into any application using the Canton Participant's JSON API. A JWT token for a specific party is required in the `Authorization: Bearer <token>` header for all requests.

The included TypeScript client in [`frontend/src/escrowService.ts`](./frontend/src/escrowService.ts) provides a reference implementation.

#### 1. Create an Escrow Request

`POST /v1/create`

```json
{
  "templateId": "Escrow.Request:EscrowRequest",
  "payload": {
    "buyer": "BuyerPartyId::...",
    "seller": "SellerPartyId::...",
    "agent": "AgentPartyId::...",
    "price": "1000.00",
    "description": "Custom Web Design Services",
    "currency": "USD",
    "requester": "BuyerPartyId::..."
  }
}
```

#### 2. Accept the Request (by a counterparty)

`POST /v1/exercise`

```json
{
  "templateId": "Escrow.Request:EscrowRequest",
  "contractId": "00...",
  "choice": "Accept",
  "argument": {}
}
```
*Note: The Agent must also accept to create the final `EscrowContract`.*

#### 3. Deposit Funds (by Buyer)

`POST /v1/exercise`

```json
{
  "templateId": "Escrow.Contract:EscrowContract",
  "contractId": "00...",
  "choice": "Deposit",
  "argument": {
    "paymentCid": "some-fungible-token-contract-id"
  }
}
```

#### 4. Confirm Delivery (by Buyer)

`POST /v1/exercise`

```json
{
  "templateId": "Escrow.Contract:EscrowContract",
  "contractId": "00...",
  "choice": "ConfirmDelivery",
  "argument": {}
}
```

#### 5. Release Payment (by Agent)

`POST /v1/exercise`

```json
{
  "templateId": "Escrow.Contract:EscrowContract",
  "contractId": "00...",
  "choice": "ReleasePayment",
  "argument": {}
}
```

## Project Structure

```
.
├── daml                   # Daml source code
│   └── Escrow
│       ├── Contract.daml  # Main escrow contract
│       ├── Dispute.daml   # Dispute resolution logic
│       └── Request.daml   # Initial request/proposal
├── frontend               # React UI for demonstration
│   ├── src
│   │   ├── App.tsx
│   │   └── escrowService.ts # TypeScript client for JSON API
│   └── package.json
├── docs
│   └── ESCROW_FLOWS.md    # Sequence diagrams
├── tests                  # Daml Script tests
│   └── EscrowTests.daml
├── .github/workflows
│   └── ci.yml             # GitHub Actions CI
├── daml.yaml              # Daml project configuration
└── README.md
```

## Testing

Run the Daml Script tests to verify the contract logic on an isolated, in-memory ledger:

```bash
dpm test
```

## Contributing

Contributions are welcome! Please open an issue to discuss your ideas or submit a pull request with your changes.

## License

This project is licensed under the [Apache 2.0 License](./LICENSE).
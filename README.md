# Canton Escrow Service

[![CI](https://github.com/digital-asset/canton-escrow-service/actions/workflows/ci.yml/badge.svg)](https://github.com/digital-asset/canton-escrow-service/actions/workflows/ci.yml)

A multi-party escrow service for secure commerce, built on the Canton Network. This project provides a set of Daml smart contracts to facilitate trustless transactions between buyers and sellers, mediated by a neutral escrow agent.

It is designed for integration into digital marketplaces, e-commerce platforms, and peer-to-peer service agreements where payment security is critical.

## Overview

In many online transactions, there's a risk for both the buyer (not receiving goods after payment) and the seller (not being paid after delivery). Traditional escrow services are centralized, slow, and often expensive.

This project leverages the privacy and atomicity guarantees of the Canton Network to provide a transparent, efficient, and secure on-ledger escrow solution.

-   **Buyer** deposits funds into the escrow contract.
-   **Seller** delivers the goods or services.
-   **Both parties** confirm the state of the transaction.
-   A neutral **Escrow Agent** oversees the process and releases funds or handles disputes according to the agreed-upon rules encoded in the smart contract.

## Features

-   **Atomic DvP**: Funds are locked simultaneously with the creation of the escrow agreement, ensuring the seller that the buyer has sufficient funds.
-   **Mutual Confirmation**: Funds are only released to the seller after both the buyer and seller confirm successful delivery.
-   **Secure Refund**: Funds are returned to the buyer if both parties agree to cancel the transaction.
-   **Dispute Resolution**: A formal process to raise and resolve disputes, with the Escrow Agent acting as a mediator or escalating to a designated arbitrator.
-   **Partial Release**: Supports complex agreements where partial payments can be released upon meeting specific milestones. See `daml/PartialRelease.daml`.
-   **Privacy**: Transaction details are only visible to the involved parties (Buyer, Seller, Escrow Agent), as is standard on Canton.

## Escrow Workflow

The lifecycle of an escrow agreement follows these steps:

1.  **Agreement & Funding**: The Buyer and Seller agree on the terms (price, item description). An `EscrowAgreement` proposal is created by one party and accepted by the other. The Buyer's funds are concurrently locked into the contract.
2.  **Delivery**: The Seller delivers the goods or services as per the agreement.
3.  **Confirmation**:
    -   The Seller confirms that delivery is complete by exercising the `ConfirmDelivery` choice.
    -   The Buyer confirms receipt and satisfaction by exercising the `ConfirmReceipt` choice.
4.  **Resolution**:
    -   **Happy Path (Release)**: Once both parties have confirmed, the Escrow Agent is authorized to release the funds to the Seller by exercising the `ReleaseFunds` choice.
    -   **Happy Path (Refund)**: If the deal is cancelled, both parties can agree to a refund. The Escrow Agent exercises `RefundBuyer` to return the funds.
    -   **Dispute Path**: If there is a disagreement, either party can exercise `RaiseDispute`. This archives the main agreement and creates a `Dispute` contract, freezing the funds until the Escrow Agent or an arbitrator resolves it.

For a detailed breakdown of the flows, see [docs/ESCROW_FLOWS.md](./docs/ESCROW_FLOWS.md).

## Getting Started (Local Development)

### Prerequisites

-   [DPM (Digital Asset Package Manager)](https://docs.digitalasset.com/dpm/getting-started.html#install-dpm) for the Canton SDK.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/canton-escrow-service.git
    cd canton-escrow-service
    ```

2.  **Build the Daml models:**
    This command compiles the Daml code into a DAR (Daml Archive).
    ```bash
    dpm build
    ```

3.  **Run the tests:**
    This executes the Daml Script tests defined in the `daml/Test` directory.
    ```bash
    dpm test
    ```

4.  **Start a local Canton ledger:**
    This command starts a single-node Canton instance (a "sandbox") with the JSON API enabled on port 7575.
    ```bash
    dpm sandbox
    ```

5.  **Run the frontend (optional):**
    The React-based frontend provides a simple interface for interacting with the contracts.
    ```bash
    cd frontend
    npm install
    npm start
    ```

## Integration for Platforms

Marketplaces and commerce platforms can integrate this escrow service via the Canton Ledger API.

### High-Level Steps

1.  **Party Management**:
    -   Allocate a unique `Party` on the Canton ledger for each user (buyer, seller) and for your platform (as the Escrow Agent). This is typically done via the JSON API's `/v2/parties/allocate` endpoint.
    -   Store the mapping between your platform's user IDs and their Canton `Party` ID.

2.  **Initiate Escrow**:
    -   When a transaction occurs on your platform, construct and submit a `create` command for the `Escrow.EscrowAgreement` template.
    -   The command must be submitted by the `buyer`, who will be the signatory on the contract and whose funds will be locked.
    -   The payload will include the `buyer`, `seller`, `escrowAgent`, the amount, and a description of the item/service.

3.  **Monitor Contract State**:
    -   Your application backend should use the JSON API's stream endpoints (`/v2/state/active-contracts` or `/v2/events/transactions`) to monitor the state of escrow contracts relevant to your users.
    -   Your UI can then reflect the current status (e.g., "Awaiting Delivery," "Funds in Escrow," "Dispute Raised").

4.  **Exercise Choices**:
    -   When a user takes an action on your platform (e.g., clicks "I have received the item"), your backend translates this into an `exercise` command on the corresponding contract.
    -   For example, a buyer's confirmation would trigger an exercise of the `ConfirmReceipt` choice on the `EscrowAgreement` contract, using the buyer's `Party` token for authorization.

## Project Structure

```
.
├── .github/workflows/      # GitHub Actions CI configuration
├── daml/
│   ├── Escrow.daml         # Main escrow agreement and lifecycle logic
│   ├── PartialRelease.daml # Logic for milestone-based partial releases
│   ├── Dispute.daml        # Dispute resolution contracts
│   └── Test/               # Daml Script tests
├── docs/
│   └── ESCROW_FLOWS.md     # Detailed sequence diagrams of user flows
├── frontend/               # Example React frontend application
├── daml.yaml               # Daml package configuration
└── README.md               # This file
```

## Contributing

Contributions are welcome! Please feel free to open a pull request or submit an issue. For major changes, please open an issue first to discuss what you would like to change.
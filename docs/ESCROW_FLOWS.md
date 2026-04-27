# Canton Escrow Service: Contract Flows

This document outlines the state transitions and interaction models for the escrow contracts provided by the Canton Escrow Service. Understanding these flows is crucial for integrating with the service and handling all possible transaction outcomes.

## Key Parties

The escrow process involves three distinct parties:

-   **Buyer**: The party purchasing goods or services and depositing funds into escrow.
-   **Seller**: The party providing the goods or services and receiving funds upon successful completion.
-   **Agent**: A neutral, trusted third party (the Escrow Agent) who facilitates the transaction, holds the funds securely, and arbitrates disputes.

## High-Level Contract States

The primary `Escrow` contract moves through several states during its lifecycle:

1.  **Proposed**: An initial proposal has been made by one party, awaiting acceptance from the other.
2.  **AwaitingFunding**: Both parties have agreed to the terms. The contract is waiting for the Buyer to deposit the funds.
3.  **Funded**: The Buyer has deposited the full amount. The contract is waiting for the Seller to deliver.
4.  **DeliveryConfirmed**: The Seller has marked the goods/services as delivered. The contract is waiting for the Buyer's confirmation or rejection.
5.  **Disputed**: The Buyer has rejected the delivery, and the Seller has disagreed with the rejection, escalating the issue to the Agent for arbitration.
6.  **Closed**: The contract has been resolved, either through successful completion, refund, cancellation, or arbitration. The final state is archival.

---

## Core Workflows

### 1. Happy Path: Successful Transaction

This is the ideal flow where the transaction completes without any issues.

**Steps:**

1.  **Propose**: The `Buyer` or `Seller` creates an `EscrowProposal` contract, defining the terms (amount, description, parties).
2.  **Accept**: The counterparty exercises the `Accept` choice on the `EscrowProposal`. This archives the proposal and creates the main `Escrow` contract in the `AwaitingFunding` state.
3.  **Fund**: The `Buyer` exercises the `Fund` choice, locking the specified amount of assets into the `Escrow` contract. The state transitions to `Funded`.
4.  **ConfirmDelivery**: The `Seller` exercises the `ConfirmDelivery` choice after providing the goods/service. The state transitions to `DeliveryConfirmed`.
5.  **ConfirmReceipt**: The `Buyer`, satisfied with the delivery, exercises the `ConfirmReceipt` choice.
6.  **ReleaseFunds**: This final confirmation automatically triggers the release of funds. The `Agent`'s role is to ensure the transfer happens, releasing the escrowed assets to the `Seller`. The `Escrow` contract is archived.

**Flow Diagram:**

```
[Buyer/Seller]        [Counterparty]         [Buyer]             [Seller]             [Buyer]             [Agent]
      |                     |                   |                   |                    |                   |
  Propose Escrow  -->   Accept Proposal -->   Fund Escrow   -->  Confirm Delivery --> Confirm Receipt --> Release Funds
      |                     |                   |                   |                    |                   |
   (Creates              (Creates             (State:             (State:              (Triggers           (Seller Paid)
EscrowProposal)         Escrow contract)       Funded)          DeliveryConfirmed)      Release)            (Contract Archived)
```

### 2. Buyer-Initiated Refund (Mutual Agreement)

This flow occurs if the Buyer is not satisfied with the delivery and the Seller agrees to a full refund.

**Steps:**

1.  **Propose, Accept, Fund, ConfirmDelivery**: These steps proceed as in the Happy Path.
2.  **RejectReceipt**: The `Buyer`, unsatisfied with the delivery, exercises the `RejectReceipt` choice, providing a reason. The state remains `DeliveryConfirmed`, but a rejection flag is noted.
3.  **AcknowledgeRejection**: The `Seller`, agreeing with the Buyer's complaint, exercises the `AcknowledgeRejection` choice.
4.  **RefundFunds**: This acknowledgment by the Seller automatically triggers a refund. The `Agent` ensures the escrowed assets are returned to the `Buyer`. The `Escrow` contract is archived.

**Flow Diagram:**

```
... --> [Seller]             [Buyer]                   [Seller]                     [Agent]
         |                    |                         |                            |
      Confirm Delivery --> Reject Receipt   -->  Acknowledge Rejection   -->     Refund Funds
         |                    |                         |                            |
      (State:              (Reason provided)         (Agrees to refund)           (Buyer Refunded)
   DeliveryConfirmed)                                                              (Contract Archived)
```

### 3. Dispute and Arbitration

This is the critical flow for handling disagreements that cannot be resolved between the Buyer and Seller.

**Steps:**

1.  **Propose, Accept, Fund, ConfirmDelivery, RejectReceipt**: These steps proceed as in the Refund flow. The Buyer has rejected the delivery.
2.  **Dispute**: The `Seller`, disagreeing with the Buyer's rejection, exercises the `Dispute` choice instead of `AcknowledgeRejection`. This transitions the `Escrow` contract state to `Disputed`.
3.  **Arbitrate**: The `Agent` is now the sole controller of the next step. The Agent reviews the case details, communicates with both parties off-ledger, and makes a binding decision.
4.  **Rule**: The `Agent` exercises one of the ruling choices on the `Disputed` contract:
    *   `RuleForBuyer`: The Agent rules in favor of the Buyer. This triggers a full refund to the `Buyer`.
    *   `RuleForSeller`: The Agent rules in favor of the Seller. This triggers a full release of funds to the `Seller`.
    *   `RuleForPartialRelease`: The Agent determines a split is appropriate. This triggers a partial release (see Advanced Scenarios).
5.  **Resolution**: Based on the Agent's ruling, funds are disbursed, and the `Escrow` contract is archived.

**Flow Diagram:**

```
... --> [Buyer]            [Seller]           [Agent]                                [Agent]
         |                   |                  |                                      |
      Reject Receipt   -->  Dispute   -->    Arbitrate (Off-Ledger)   -->  Rule (For Buyer/Seller/Partial)
         |                   |                  |                                      |
      (Reason              (State:            (Reviews evidence, etc.)               (Triggers Refund/Release)
       provided)            Disputed)                                                (Contract Archived)
```

### 4. Mutual Cancellation (Pre-Funding)

This flow allows parties to back out of the agreement before any funds have been committed.

**Steps:**

1.  **Propose, Accept**: The `Escrow` contract is created and is in the `AwaitingFunding` state.
2.  **ProposeCancel**: The `Buyer` or `Seller` decides to cancel and exercises the `ProposeCancel` choice.
3.  **AcceptCancel**: The counterparty agrees and exercises the `AcceptCancel` choice.
4.  **Archive**: The contract is archived. No funds are moved as none were escrowed.

**Note**: If the counterparty does not accept the cancellation, the contract remains in the `AwaitingFunding` state. It may eventually expire based on a timeout policy (if implemented).

---

## Advanced Scenarios

### Partial Release

A partial release can occur in two main ways: by mutual agreement or as the result of an arbitration ruling. This is handled by the `PartialRelease` module.

**Scenario A: Mutual Agreement**

1.  After delivery, the Buyer and Seller may agree that only a portion of the funds should be released. For example, if half the goods were delivered correctly.
2.  One party (e.g., `Seller`) creates a `PartialReleaseProposal` contract, specifying the amount to release to the Seller and the amount to refund to the Buyer.
3.  The `Buyer` reviews the proposal and exercises the `Accept` choice.
4.  This action atomically:
    *   Exercises a `SettlePartially` choice on the main `Escrow` contract.
    *   The `Agent` releases the specified amount to the `Seller`.
    *   The `Agent` refunds the remaining amount to the `Buyer`.
    *   The `Escrow` contract and the `PartialReleaseProposal` are archived.

**Scenario B: Arbitration Ruling**

1.  During the Dispute and Arbitration flow, the `Agent` decides a split is the fairest outcome.
2.  The `Agent` exercises the `RuleForPartialRelease` choice on the `Disputed` escrow contract.
3.  The choice payload requires the `Agent` to specify the amount for the Seller and the amount for the Buyer.
4.  This action atomically disburses the funds according to the ruling and archives the `Escrow` contract.
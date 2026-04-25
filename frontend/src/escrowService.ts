// Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Escrow,
  PartialRelease,
} from "@daml.js/canton-escrow-service-0.1.0";
import { ContractId } from "@daml/types";

// Assuming the ledger is running on the default sandbox port.
// In a production environment, this should come from a configuration file.
const LEDGER_URL = "http://localhost:7575";

const api = {
  v1: {
    create: `${LEDGER_URL}/v1/create`,
    exercise: `${LEDGER_URL}/v1/exercise`,
  },
};

/**
 * A generic error class for ledger API failures.
 */
export class LedgerApiError extends Error {
  constructor(message: string, public readonly response?: any) {
    super(message);
    this.name = "LedgerApiError";
  }
}

/**
 * A helper function to wrap fetch calls for Daml ledger commands.
 * @param endpoint The API endpoint to call (e.g., /v1/create).
 * @param token The JWT token for authorization.
 * @param body The request body.
 * @returns The parsed JSON response from the ledger.
 * @throws {LedgerApiError} if the API call fails.
 */
const sendCommand = async <T>(
  endpoint: string,
  token: string,
  body: object
): Promise<T> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Ledger API call failed:", errorBody);
    throw new LedgerApiError(
      `Ledger API call failed with status ${response.status}`,
      errorBody
    );
  }

  const json = await response.json();
  if (json.status !== 200) {
    console.error("Ledger command failed:", json.errors);
    throw new LedgerApiError("Ledger command failed", json.errors);
  }

  return json.result as T;
};

/**
 * Creates an Escrow.Model.EscrowAgreementProposal contract.
 *
 * @param token The JWT token for authorization.
 * @param payload The data for the escrow agreement.
 * @returns The result of the create command.
 */
export const proposeEscrowAgreement = (
  token: string,
  payload: Escrow.Model.EscrowAgreementProposal
) => {
  return sendCommand(api.v1.create, token, {
    templateId: Escrow.Model.EscrowAgreementProposal.templateId,
    payload,
  });
};

/**
 * Exercises the `Accept` choice on an Escrow.Model.EscrowAgreementProposal contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the EscrowAgreementProposal.
 * @returns The result of the exercise command.
 */
export const acceptEscrowAgreement = (
  token: string,
  contractId: ContractId<Escrow.Model.EscrowAgreementProposal>
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.EscrowAgreementProposal.templateId,
    contractId,
    choice: "Accept",
    argument: {},
  });
};

/**
 * Exercises the `Deposit` choice on an Escrow.Model.EscrowAgreement contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the EscrowAgreement.
 * @returns The result of the exercise command.
 */
export const deposit = (
  token: string,
  contractId: ContractId<Escrow.Model.EscrowAgreement>
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.EscrowAgreement.templateId,
    contractId,
    choice: "Deposit",
    argument: {},
  });
};

/**
 * Exercises the `ConfirmReceiptAndRelease` choice on a Escrow.Model.FundedEscrow contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the FundedEscrow contract.
 * @returns The result of the exercise command.
 */
export const confirmReceiptAndRelease = (
  token: string,
  contractId: ContractId<Escrow.Model.FundedEscrow>
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.FundedEscrow.templateId,
    contractId,
    choice: "ConfirmReceiptAndRelease",
    argument: {},
  });
};

/**
 * Exercises the `RaiseDispute` choice on a Escrow.Model.FundedEscrow contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the FundedEscrow contract.
 * @param reason A string describing the reason for the dispute.
 * @returns The result of the exercise command.
 */
export const raiseDispute = (
  token: string,
  contractId: ContractId<Escrow.Model.FundedEscrow>,
  reason: string
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.FundedEscrow.templateId,
    contractId,
    choice: "RaiseDispute",
    argument: { reason },
  });
};

/**
 * Exercises the `ResolveForSeller` choice on a Escrow.Model.DisputedEscrow contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the DisputedEscrow contract.
 * @param arbitratorComment A comment from the arbitrator.
 * @returns The result of the exercise command.
 */
export const resolveDisputeForSeller = (
  token: string,
  contractId: ContractId<Escrow.Model.DisputedEscrow>,
  arbitratorComment: string
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.DisputedEscrow.templateId,
    contractId,
    choice: "ResolveForSeller",
    argument: { arbitratorComment },
  });
};

/**
 * Exercises the `ResolveForBuyer` choice on a Escrow.Model.DisputedEscrow contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the DisputedEscrow contract.
 * @param arbitratorComment A comment from the arbitrator.
 * @returns The result of the exercise command.
 */
export const resolveDisputeForBuyer = (
  token: string,
  contractId: ContractId<Escrow.Model.DisputedEscrow>,
  arbitratorComment: string
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.DisputedEscrow.templateId,
    contractId,
    choice: "ResolveForBuyer",
    argument: { arbitratorComment },
  });
};

/**
 * Exercises the `RequestPartialRelease` choice on a Escrow.Model.FundedEscrow contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the FundedEscrow contract.
 * @param args The arguments for the partial release request.
 * @returns The result of the exercise command.
 */
export const requestPartialRelease = (
  token: string,
  contractId: ContractId<Escrow.Model.FundedEscrow>,
  args: PartialRelease.Model.PartialReleaseRequestArgs
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: Escrow.Model.FundedEscrow.templateId,
    contractId,
    choice: "RequestPartialRelease",
    argument: args,
  });
};

/**
 * Exercises the `ApprovePartialRelease` choice on a PartialRelease.Model.PartialReleaseRequest contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the PartialReleaseRequest contract.
 * @returns The result of the exercise command.
 */
export const approvePartialRelease = (
  token: string,
  contractId: ContractId<PartialRelease.Model.PartialReleaseRequest>
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: PartialRelease.Model.PartialReleaseRequest.templateId,
    contractId,
    choice: "ApprovePartialRelease",
    argument: {},
  });
};

/**
 * Exercises the `RejectPartialRelease` choice on a PartialRelease.Model.PartialReleaseRequest contract.
 *
 * @param token The JWT token for authorization.
 * @param contractId The Contract ID of the PartialReleaseRequest contract.
 * @param reason The reason for rejection.
 * @returns The result of the exercise command.
 */
export const rejectPartialRelease = (
  token: string,
  contractId: ContractId<PartialRelease.Model.PartialReleaseRequest>,
  reason: string
) => {
  return sendCommand(api.v1.exercise, token, {
    templateId: PartialRelease.Model.PartialReleaseRequest.templateId,
    contractId,
    choice: "RejectPartialRelease",
    argument: { reason },
  });
};
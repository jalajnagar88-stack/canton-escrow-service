// Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Service layer for interacting with the Daml ledger via the JSON API.
 * This file encapsulates all ledger communication related to the Escrow workflow.
 */

// --- Constants -----------------------------------------------------------------

// In a real application, this would come from a configuration file or environment variable.
const LEDGER_URL = 'http://localhost:7575';
const API_BASE = `${LEDGER_URL}/v1`;

// Template IDs used for ledger interactions.
// These must match the module and template names in your Daml code.
const ESCROW_PROPOSAL_TID = 'EscrowAgent:EscrowProposal';
const ESCROW_TID = 'EscrowAgent:Escrow';
const DISPUTE_TID = 'DisputeResolution:Dispute';


// --- Type Definitions ----------------------------------------------------------

/**
 * Represents a generic active contract fetched from the Daml ledger.
 * @template T The type of the contract payload.
 */
export interface DamlContract<T> {
  contractId: string;
  templateId: string;
  payload: T;
}

/**
 * Payload for the EscrowProposal template.
 */
export interface EscrowProposal {
  proposer: string;
  counterparty: string;
  agent: string;
  amount: string; // Daml Decimal is represented as a string in JSON
  description: string;
}

/**
 * Possible statuses for an Escrow contract.
 * This should align with the `EscrowStatus` data type in Daml.
 */
export type EscrowStatus =
  | 'Pending'
  | 'Funded'
  | 'DeliveryConfirmed'
  | 'ReceiptConfirmed'
  | 'Completed'
  | 'Refunded'
  | 'Disputed';

/**
 * Payload for the Escrow template.
 */
export interface Escrow {
  buyer: string;
  seller: string;
  agent: string;
  amount: string;
  description: string;
  status: EscrowStatus;
  buyerConfirmedDelivery: boolean;
  sellerConfirmedReceipt: boolean;
}

/**
 * Payload for the Dispute template.
 */
export interface Dispute {
    escrowContract: Escrow;
    claimant: string;
    respondent: string;
    agent: string;
    reason: string;
}


// --- Private API Helper --------------------------------------------------------

/**
 * A generic helper function to make requests to the Daml JSON API.
 * @param endpoint The API endpoint to call (e.g., '/create').
 * @param token The JWT token for the party making the request.
 * @param body The request body.
 * @returns The 'result' field from the JSON API response.
 * @throws An error if the network request or the ledger command fails.
 */
const apiPost = async <T>(endpoint: string, token: string, body: object): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.errors?.join(', ') || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data.result as T;
  } catch (error) {
    console.error(`Failed to call ${endpoint}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
};


// --- Public Service Functions -------------------------------------------------

// --- Create Operations ---

/**
 * Creates a new EscrowProposal contract on the ledger.
 * @param token The JWT for the proposing party.
 * @param proposal The details of the escrow proposal.
 * @returns The created contract object.
 */
export const createEscrowProposal = (token: string, proposal: EscrowProposal) => {
  return apiPost<DamlContract<EscrowProposal>>('/create', token, {
    templateId: ESCROW_PROPOSAL_TID,
    payload: proposal,
  });
};


// --- Exercise Operations ---

/**
 * Exercises the 'Accept' choice on an EscrowProposal contract.
 * @param token The JWT for the counterparty accepting the proposal.
 * @param proposalCid The Contract ID of the EscrowProposal to accept.
 * @returns The result of the choice exercise, typically the created Escrow contract.
 */
export const acceptEscrowProposal = (token: string, proposalCid: string) => {
  return apiPost<DamlContract<Escrow>>('/exercise', token, {
    templateId: ESCROW_PROPOSAL_TID,
    contractId: proposalCid,
    choice: 'Accept',
    argument: {},
  });
};

/**
 * Exercises the 'DepositFunds' choice on an Escrow contract.
 * @param token The JWT for the buyer.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @returns The result of the choice exercise.
 */
export const depositFunds = (token: string, escrowCid: string) => {
  return apiPost<DamlContract<Escrow>>('/exercise', token, {
    templateId: ESCROW_TID,
    contractId: escrowCid,
    choice: 'DepositFunds',
    argument: {},
  });
};

/**
 * Exercises the 'ConfirmDelivery' choice on an Escrow contract.
 * @param token The JWT for the buyer.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @returns The result of the choice exercise.
 */
export const confirmDelivery = (token: string, escrowCid: string) => {
  return apiPost<DamlContract<Escrow>>('/exercise', token, {
    templateId: ESCROW_TID,
    contractId: escrowCid,
    choice: 'ConfirmDelivery',
    argument: {},
  });
};

/**
 * Exercises the 'ConfirmReceipt' choice on an Escrow contract.
 * @param token The JWT for the seller.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @returns The result of the choice exercise.
 */
export const confirmReceipt = (token: string, escrowCid: string) => {
    return apiPost<DamlContract<Escrow>>('/exercise', token, {
      templateId: ESCROW_TID,
      contractId: escrowCid,
      choice: 'ConfirmReceipt',
      argument: {},
    });
  };

/**
 * Exercises the 'ReleaseFunds' choice on an Escrow contract.
 * @param token The JWT for the escrow agent.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @returns The result of the choice exercise (which archives the contract).
 */
export const releaseFunds = (token: string, escrowCid: string) => {
  return apiPost<object>('/exercise', token, {
    templateId: ESCROW_TID,
    contractId: escrowCid,
    choice: 'ReleaseFunds',
    argument: {},
  });
};

/**
 * Exercises the 'RefundFunds' choice on an Escrow contract.
 * @param token The JWT for the escrow agent.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @returns The result of the choice exercise (which archives the contract).
 */
export const refundFunds = (token: string, escrowCid: string) => {
    return apiPost<object>('/exercise', token, {
      templateId: ESCROW_TID,
      contractId: escrowCid,
      choice: 'RefundFunds',
      argument: {},
    });
  };

/**
 * Exercises the 'InitiateDispute' choice on an Escrow contract.
 * @param token The JWT for the buyer or seller initiating the dispute.
 * @param escrowCid The Contract ID of the Escrow contract.
 * @param reason A string explaining the reason for the dispute.
 * @returns The created Dispute contract.
 */
export const initiateDispute = (token: string, escrowCid: string, reason: string) => {
  return apiPost<DamlContract<Dispute>>('/exercise', token, {
    templateId: ESCROW_TID,
    contractId: escrowCid,
    choice: 'InitiateDispute',
    argument: { reason },
  });
};


// --- Query Operations ---

/**
 * Queries the ledger for all active EscrowProposal contracts visible to the party.
 * @param token The JWT for the party querying the ledger.
 * @returns A promise that resolves to an array of active EscrowProposal contracts.
 */
export const queryEscrowProposals = (token: string) => {
  return apiPost<DamlContract<EscrowProposal>[]>('/query', token, {
    templateIds: [ESCROW_PROPOSAL_TID],
  });
};

/**
 * Queries the ledger for all active Escrow contracts visible to the party.
 * @param token The JWT for the party querying the ledger.
 * @returns A promise that resolves to an array of active Escrow contracts.
 */
export const queryActiveEscrows = (token: string) => {
  return apiPost<DamlContract<Escrow>[]>('/query', token, {
    templateIds: [ESCROW_TID],
  });
};

/**
 * Queries the ledger for all active Dispute contracts visible to the party.
 * @param token The JWT for the party querying the ledger.
 * @returns A promise that resolves to an array of active Dispute contracts.
 */
export const queryDisputes = (token: string) => {
    return apiPost<DamlContract<Dispute>[]>('/query', token, {
      templateIds: [DISPUTE_TID],
    });
  };
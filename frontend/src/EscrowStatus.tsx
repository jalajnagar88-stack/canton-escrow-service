import React from 'react';
// This import path assumes DPM has generated JS bindings for the `canton-escrow-service`
// package, version 0.1.0, into the `node_modules` directory.
import { Escrow } from '@daml.js/canton-escrow-service-0.1.0/lib/Escrow/Model';

/**
 * Defines the properties (props) that the EscrowStatus component accepts.
 */
interface EscrowStatusProps {
  /** The active Escrow contract instance whose status is to be displayed. */
  escrow: Escrow;
}

/**
 * Defines the visual and descriptive details for each possible escrow status.
 */
interface StatusDetails {
  text: string;
  color: string;
  backgroundColor: string;
  description: string;
}

/**
 * A mapping from the Daml EscrowStatus variant names to their corresponding
 * display properties. This centralizes the presentation logic.
 */
const statusMap: Record<string, StatusDetails> = {
  Funded: {
    text: 'Funded',
    color: '#00529B',
    backgroundColor: '#BDE5F8',
    description: 'Buyer has deposited funds. Awaiting seller to confirm delivery of goods/services.',
  },
  DeliveryConfirmed: {
    text: 'Delivery Confirmed',
    color: '#9F6000',
    backgroundColor: '#FEEFB3',
    description: 'Seller has confirmed delivery. Awaiting buyer to confirm satisfactory receipt.',
  },
  Completed: {
    text: 'Completed',
    color: '#4F8A10',
    backgroundColor: '#DFF2BF',
    description: 'Transaction complete. Funds have been released to the seller.',
  },
  Disputed: {
    text: 'Disputed',
    color: '#D8000C',
    backgroundColor: '#FFD2D2',
    description: 'A dispute has been raised. The escrow agent will now arbitrate.',
  },
  Refunded: {
    text: 'Refunded',
    color: '#555',
    backgroundColor: '#e9ecef',
    description: 'Dispute resolved in favor of the buyer. Funds have been refunded.',
  },
  Released: {
    text: 'Released',
    color: '#00705a',
    backgroundColor: '#d1e7dd',
    description: 'Dispute resolved in favor of the seller. Funds have been released.',
  },
};

const defaultStatus: StatusDetails = {
  text: 'Unknown',
  color: '#6c757d',
  backgroundColor: '#e9ecef',
  description: 'The escrow contract is in an unknown or unrecognized state.',
};

/**
 * A React component that renders a status card for an Escrow contract.
 * It provides a clear, color-coded visual indicator of the current stage
 * in the escrow lifecycle, along with a user-friendly description.
 */
const EscrowStatus: React.FC<EscrowStatusProps> = ({ escrow }) => {
  // The `status` field from the Daml contract payload is a string representation
  // of the Daml variant (e.g., "Funded"). We use it to look up display details.
  const statusDetails = statusMap[escrow.status] || defaultStatus;

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${statusDetails.color}`,
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    maxWidth: '450px',
    margin: '1rem 0',
  };

  const headerStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    color: '#343a40',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '8px',
  };

  const statusBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '16px',
    backgroundColor: statusDetails.backgroundColor,
    color: statusDetails.color,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginBottom: '12px',
    border: `1px solid ${statusDetails.color}`,
  };

  const descriptionStyle: React.CSSProperties = {
    margin: '0',
    color: '#495057',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  };

  return (
    <div style={cardStyle}>
      <h4 style={headerStyle}>Escrow Status</h4>
      <div style={statusBadgeStyle}>
        {statusDetails.text}
      </div>
      <p style={descriptionStyle}>
        {statusDetails.description}
      </p>
    </div>
  );
};

export default EscrowStatus;
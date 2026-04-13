import React, { useState } from 'react';
import { useLedger } from '@c7/react';
import { Escrow } from '@canton-escrow-service/daml-codegen/dist/Main';
import './DisputeForm.css';

/**
 * Props for the DisputeForm component.
 */
interface DisputeFormProps {
  /** The contract ID of the Escrow to raise a dispute against. */
  contractId: Escrow.CreateEvent['contractId'];
  /** Callback invoked when the dispute has been successfully raised. */
  onDisputeRaised: () => void;
  /** Callback invoked when the user cancels the form. */
  onCancel: () => void;
}

/**
 * A form component for buyers or sellers to raise a dispute on an active escrow contract.
 * It captures the reason for the dispute and a URL for supporting evidence, then
 * exercises the `RaiseDispute` choice on the contract.
 */
export const DisputeForm: React.FC<DisputeFormProps> = ({ contractId, onDisputeRaised, onCancel }) => {
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ledger = useLedger();

  /**
   * Handles the form submission by exercising the `RaiseDispute` choice.
   * @param e The form event.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A reason for the dispute must be provided.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const choiceArg = {
        disputeReason: reason,
        evidenceUrl: evidenceUrl.trim() === '' ? null : evidenceUrl.trim(),
      };

      await ledger.exercise(Escrow.RaiseDispute, contractId, choiceArg);
      onDisputeRaised();
    } catch (err: any) {
      console.error("Error raising dispute:", err);
      setError(err.message || "An unexpected error occurred while submitting the dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispute-form-overlay">
      <div className="dispute-form-card">
        <div className="dispute-form-header">
          <h2>Raise a Dispute</h2>
          <p>
            The escrow agent will be notified to review the case. Please provide a clear reason
            and a link to any supporting evidence.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="dispute-form">
          <div className="form-group">
            <label htmlFor="dispute-reason">Reason for Dispute *</label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Item was not delivered, service was incomplete, product is defective..."
              required
              rows={5}
              disabled={isSubmitting}
              aria-describedby="reason-help"
            />
            <small id="reason-help">This will be shared with the other party and the escrow agent.</small>
          </div>

          <div className="form-group">
            <label htmlFor="evidence-url">Evidence (URL)</label>
            <input
              id="evidence-url"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://link.to/your/evidence (e.g., photos, documents)"
              disabled={isSubmitting}
              aria-describedby="evidence-help"
            />
            <small id="evidence-help">Optional. Provide a link to a file or folder with evidence.</small>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !reason} className="btn-primary">
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
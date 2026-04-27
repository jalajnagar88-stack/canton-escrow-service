import React, { useState } from 'react';
import { useLedger, Ledger } from '@c7/react'; // Assuming @c7/react provides ledger context

/**
 * Props for the DisputeForm component.
 */
interface DisputeFormProps {
  /** The contract ID of the Escrow contract to be disputed. */
  escrowContractId: string;
  /** Callback function invoked upon successful dispute submission. It receives the new dispute contract ID. */
  onDisputeRaised: (disputeContractId: string) => void;
  /** Callback function to cancel the dispute process and close the form. */
  onCancel: () => void;
  /** The party ID of the user raising the dispute (buyer or seller). */
  party: string;
  /** The template ID of the escrow contract, required for exercising choices. */
  templateId: string;
}

/**
 * A form component for a buyer or seller to raise a dispute on an active escrow contract.
 * It allows providing a detailed reason and attaching evidence files. In a production
 * scenario, file attachments would be uploaded to a secure storage service (e.g., S3, IPFS),
 * and their URLs or content identifiers would be passed to the Daml choice.
 */
export const DisputeForm: React.FC<DisputeFormProps> = ({
  escrowContractId,
  onDisputeRaised,
  onCancel,
  party,
  templateId
}) => {
  const ledger = useLedger() as Ledger; // Cast to Ledger to access exercise methods
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    } else {
      setFiles(null);
    }
  };

  /**
   * Simulates uploading files to an external store and returns identifiers.
   * In a real app, this would interact with a backend service.
   * @returns A promise that resolves to an array of string identifiers for the evidence.
   */
  const getEvidenceIdentifiers = async (): Promise<string[]> => {
    if (!files || files.length === 0) {
      return [];
    }
    // Simulate a network delay for file uploads
    await new Promise(resolve => setTimeout(resolve, 500));
    // Here, we just use the filenames as identifiers. A real implementation
    // would return URLs from a service like S3 or IPFS.
    return Array.from(files).map(file => `urn:evidence:file:${file.name}`);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason for the dispute is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const evidence = await getEvidenceIdentifiers();

      const exerciseCommand = {
        templateId,
        contractId: escrowContractId,
        choice: 'RaiseDispute',
        argument: {
          reason,
          evidence,
        },
      };

      // Assuming the @c7/react ledger instance has a v1 API compatible method
      // The exact API might differ. This uses a common pattern.
      const result = await ledger.exercise(exerciseCommand);

      const disputeCid = result?.exerciseResult;
      if (!disputeCid || typeof disputeCid !== 'string') {
        throw new Error('Could not retrieve contract ID for the newly created dispute.');
      }

      onDisputeRaised(disputeCid);

    } catch (err: any) {
      console.error('Failed to raise dispute:', err);
      setError(err.message || 'An unknown error occurred while submitting the dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg mx-auto my-8 border border-gray-200">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Raise a Dispute</h2>
          <p className="text-gray-600 mt-1">
            The escrow agent will be notified to review the case.
          </p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="reason" className="block text-gray-700 text-sm font-bold mb-2">
            Reason for Dispute
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-y"
            placeholder="Please provide a clear and detailed explanation of the issue..."
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="evidence" className="block text-gray-700 text-sm font-bold mb-2">
            Attach Supporting Evidence (Optional)
          </label>
          <input
            id="evidence"
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            disabled={isSubmitting}
          />
          {files && files.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border">
              <p className="font-semibold">Selected files:</p>
              <ul className="list-disc list-inside mt-1">
                {Array.from(files).map((file, index) => (
                  <li key={index} className="truncate">{file.name} ({Math.round(file.size / 1024)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p className="font-bold">Submission Failed</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : 'Submit Dispute'}
          </button>
        </div>
      </form>
    </div>
  );
};
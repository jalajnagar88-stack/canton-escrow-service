import React from 'react';
import { FaHourglassHalf, FaTruck, FaGavel, FaCheckCircle, FaUndo } from 'react-icons/fa';

/**
 * Defines the possible lifecycle statuses of an escrow agreement.
 * This should correspond to the state derivable from the active contracts on the ledger.
 */
export type EscrowLifecycleStatus =
  | "Funded"
  | "GoodsDelivered"
  | "Disputed"
  | "Completed"
  | "Refunded"
  | "ArbitratedRelease"
  | "ArbitratedRefund";

interface EscrowStatusProps {
  /** The current status of the escrow agreement. */
  status: EscrowLifecycleStatus;
}

interface StatusConfig {
  text: string;
  description: string;
  color: string;
  icon: React.ReactElement;
  step: number;
}

// Configuration mapping each status to its UI representation.
const statusConfig: Record<EscrowLifecycleStatus, StatusConfig> = {
  Funded: {
    text: "Funded",
    description: "Buyer has deposited funds. Awaiting seller to confirm delivery.",
    color: "bg-blue-100 text-blue-800",
    icon: <FaHourglassHalf />,
    step: 1,
  },
  GoodsDelivered: {
    text: "Goods Delivered",
    description: "Seller has confirmed delivery. Awaiting buyer's confirmation to release funds.",
    color: "bg-yellow-100 text-yellow-800",
    icon: <FaTruck />,
    step: 2,
  },
  Disputed: {
    text: "Disputed",
    description: "A dispute has been raised. The escrow agent will review and mediate.",
    color: "bg-orange-100 text-orange-800",
    icon: <FaGavel />,
    step: 3, // Off the main path
  },
  Completed: {
    text: "Completed",
    description: "Buyer confirmed receipt. Funds have been released to the seller.",
    color: "bg-green-100 text-green-800",
    icon: <FaCheckCircle />,
    step: 4,
  },
  Refunded: {
    text: "Refunded",
    description: "The agreement was canceled. Funds have been returned to the buyer.",
    color: "bg-gray-100 text-gray-800",
    icon: <FaUndo />,
    step: 4,
  },
  ArbitratedRelease: {
    text: "Resolved: Released",
    description: "The dispute was resolved by an arbitrator. Funds have been released to the seller.",
    color: "bg-green-100 text-green-800",
    icon: <FaCheckCircle />,
    step: 4,
  },
  ArbitratedRefund: {
    text: "Resolved: Refunded",
    description: "The dispute was resolved by an arbitrator. Funds have been returned to the buyer.",
    color: "bg-gray-100 text-gray-800",
    icon: <FaUndo />,
    step: 4,
  },
};

const steps = [
  { id: 1, name: 'Funded' },
  { id: 2, name: 'Delivered' },
  { id: 3, name: 'Completed' },
];

/**
 * A visual component to display the current status of an escrow agreement
 * using a clear status badge and a timeline/stepper for the happy path.
 * Styling is done via TailwindCSS classes.
 */
export const EscrowStatus: React.FC<EscrowStatusProps> = ({ status }) => {
  const currentStatusInfo = statusConfig[status];
  const currentStep = currentStatusInfo.step;

  const isDisputed = status === 'Disputed';
  const isFinished = ['Completed', 'Refunded', 'ArbitratedRelease', 'ArbitratedRefund'].includes(status);
  const isHappyPathFinished = status === 'Completed';

  const getStepClass = (stepId: number) => {
    if (stepId < currentStep || isHappyPathFinished) {
      return 'bg-indigo-600'; // Completed step
    }
    if (stepId === currentStep && !isFinished) {
      return 'border-2 border-indigo-600'; // Current step
    }
    return 'border-2 border-gray-300'; // Future step
  };

  const getStepTextClass = (stepId: number) => {
    if (stepId < currentStep || (stepId <= currentStep && isHappyPathFinished)) {
      return 'text-indigo-600';
    }
    return 'text-gray-500';
  };

  const getConnectorClass = (stepId: number) => {
    if (stepId < currentStep || isHappyPathFinished) {
      return 'bg-indigo-600';
    }
    return 'bg-gray-200';
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Escrow Status</h3>

      {/* Main Status Badge */}
      <div className={`flex items-center p-3 rounded-md mb-8 ${currentStatusInfo.color}`}>
        <div className="mr-3 text-xl">{currentStatusInfo.icon}</div>
        <div>
          <p className="font-bold">{currentStatusInfo.text}</p>
          <p className="text-sm">{currentStatusInfo.description}</p>
        </div>
      </div>

      {/* Timeline/Stepper - not shown for terminal/disputed states */}
      {!isFinished && !isDisputed && (
        <div className="px-4 pb-4">
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex items-center">
                    {/* Circle */}
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full ${getStepClass(step.id)}`}
                      style={{ transition: 'background-color 0.3s, border-color 0.3s' }}
                    >
                      {step.id < currentStep ? (
                        <FaCheckCircle className="h-5 w-5 text-white" aria-hidden="true" />
                      ) : (
                        <span className="h-2.5 w-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    {/* Connector */}
                    {stepIdx !== steps.length - 1 && (
                      <div className={`h-0.5 w-full ${getConnectorClass(step.id + 1)} ml-4`} aria-hidden="true" />
                    )}
                  </div>
                  {/* Label */}
                  <div className="absolute mt-2 w-max text-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <span className={`text-sm font-medium ${getStepTextClass(step.id)}`}>{step.name}</span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
    </div>
  );
};

export default EscrowStatus;
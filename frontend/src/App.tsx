import React, { useState, useEffect, useMemo } from 'react';
import { DamlLedger, useParty, useLedger, useStreamQueries, Contract } from '@c7/react';
import {
  Agreement,
  Funded,
  Delivered,
  Disputed
} from '@canton-escrow-service/daml-ts';
import { DisputeForm } from './DisputeForm';
import './App.css';

// --- Constants ----------------------------------------------------------------

const LEDGER_HOST = 'localhost';
const LEDGER_PORT = '7575';
const HTTP_URL = `http://${LEDGER_HOST}:${LEDGER_PORT}/`;
const WEBSOCKET_URL = `ws://${LEDGER_HOST}:${LEDGER_PORT}/`;

const TEMPLATES = {
  Agreement: Agreement.templateId,
  Funded: Funded.templateId,
  Delivered: Delivered.templateId,
  Disputed: Disputed.templateId,
};

// --- Main App Component -------------------------------------------------------

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<{ party: string; token: string } | undefined>();

  useEffect(() => {
    const party = localStorage.getItem('party');
    const token = localStorage.getItem('token');
    if (party && token) {
      setCredentials({ party, token });
    }
  }, []);

  const handleLogin = (creds: { party: string; token: string }) => {
    localStorage.setItem('party', creds.party);
    localStorage.setItem('token', creds.token);
    setCredentials(creds);
  };

  const handleLogout = () => {
    localStorage.removeItem('party');
    localStorage.removeItem('token');
    setCredentials(undefined);
    // Force a full page reload to clear any component state
    window.location.reload();
  };

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DamlLedger
      party={credentials.party}
      token={credentials.token}
      httpBaseUrl={HTTP_URL}
      wsBaseUrl={WEBSOCKET_URL}
    >
      <MainScreen onLogout={handleLogout} />
    </DamlLedger>
  );
};

// --- Login Screen Component ---------------------------------------------------

interface LoginScreenProps {
  onLogin: (credentials: { party: string; token: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [party, setParty] = useState('');
  const [token, setToken] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (party && token) {
      onLogin({ party, token });
    }
  };

  return (
    <div className="container">
      <div className="login-container">
        <h1>Canton Escrow Service</h1>
        <p>Please log in with your Party ID and JWT Token.</p>
        <form onSubmit={login}>
          <input
            type="text"
            placeholder="Party ID (e.g., Alice::1220...)"
            value={party}
            onChange={(e) => setParty(e.target.value)}
          />
          <input
            type="password"
            placeholder="JWT Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit" className="button">Login</button>
        </form>
      </div>
    </div>
  );
};


// --- Main Dashboard Screen ----------------------------------------------------

interface MainScreenProps {
  onLogout: () => void;
}

const MainScreen: React.FC<MainScreenProps> = ({ onLogout }) => {
  const party = useParty();
  const ledger = useLedger();
  const [disputingContract, setDisputingContract] = useState<Contract<Funded | Delivered> | null>(null);

  const { contracts: agreements, loading: loadingAgreements } = useStreamQueries(Agreement);
  const { contracts: funded, loading: loadingFunded } = useStreamQueries(Funded);
  const { contracts: delivered, loading: loadingDelivered } = useStreamQueries(Delivered);
  const { contracts: disputed, loading: loadingDisputed } = useStreamQueries(Disputed);

  const loading = loadingAgreements || loadingFunded || loadingDelivered || loadingDisputed;

  const getRole = (payload: any): string => {
    if (payload.buyer === party) return "Buyer";
    if (payload.seller === party) return "Seller";
    if (payload.agent === party) return "Agent";
    return "Observer";
  };

  const exerciseChoice = async (
    template: { exercise: (cid: any, arg: any) => any },
    cid: string,
    arg: any = {}
  ) => {
    try {
      await ledger.exercise(template, cid, arg);
    } catch (error) {
      alert(`Error exercising choice: ${error}`);
      console.error("EXERCISE_ERROR:", error);
    }
  };

  const handleDisputeSubmit = async (reason: string) => {
    if (!disputingContract) return;

    const choice = disputingContract.templateId === TEMPLATES.Funded ? Funded.RaiseDispute : Delivered.RaiseDispute;
    await exerciseChoice(choice, disputingContract.contractId, { reason });
    setDisputingContract(null);
  };

  const memoizedDashboard = useMemo(() => (
    <>
      <div className="card">
        <h2>Awaiting Funding</h2>
        <ContractTable
          contracts={agreements}
          columns={['ID', 'Amount', 'Seller', 'Agent', 'Role', 'Actions']}
          renderRow={(c) => (
            <tr key={c.contractId}>
              <td>{c.contractId.substring(0, 8)}...</td>
              <td>{c.payload.amount}</td>
              <td>{c.payload.seller}</td>
              <td>{c.payload.agent}</td>
              <td>{getRole(c.payload)}</td>
              <td>
                {c.payload.buyer === party && (
                  <button className="button-small" onClick={() => exerciseChoice(Agreement.Fund, c.contractId)}>Fund</button>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      <div className="card">
        <h2>Funded (Awaiting Delivery Confirmation)</h2>
        <ContractTable
          contracts={funded}
          columns={['ID', 'Amount', 'Buyer', 'Seller', 'Role', 'Actions']}
          renderRow={(c) => (
            <tr key={c.contractId}>
              <td>{c.contractId.substring(0, 8)}...</td>
              <td>{c.payload.amount}</td>
              <td>{c.payload.buyer}</td>
              <td>{c.payload.seller}</td>
              <td>{getRole(c.payload)}</td>
              <td>
                {c.payload.seller === party && (
                  <button className="button-small" onClick={() => exerciseChoice(Funded.ConfirmDelivery, c.contractId)}>Confirm Delivery</button>
                )}
                {(c.payload.buyer === party || c.payload.seller === party) && (
                  <button className="button-small button-secondary" onClick={() => setDisputingContract(c)}>Dispute</button>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      <div className="card">
        <h2>Delivered (Awaiting Fund Release)</h2>
        <ContractTable
          contracts={delivered}
          columns={['ID', 'Amount', 'Buyer', 'Seller', 'Role', 'Actions']}
          renderRow={(c) => (
            <tr key={c.contractId}>
              <td>{c.contractId.substring(0, 8)}...</td>
              <td>{c.payload.amount}</td>
              <td>{c.payload.buyer}</td>
              <td>{c.payload.seller}</td>
              <td>{getRole(c.payload)}</td>
              <td>
                {(c.payload.buyer === party || c.payload.agent === party) && (
                  <button className="button-small" onClick={() => exerciseChoice(Delivered.ReleaseFunds, c.contractId)}>Release Funds</button>
                )}
                {c.payload.buyer === party && (
                  <button className="button-small button-secondary" onClick={() => setDisputingContract(c)}>Dispute</button>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      <div className="card">
        <h2>Disputed (Awaiting Agent Resolution)</h2>
        <ContractTable
          contracts={disputed}
          columns={['ID', 'Amount', 'Reason', 'Buyer', 'Seller', 'Role', 'Actions']}
          renderRow={(c) => (
            <tr key={c.contractId}>
              <td>{c.contractId.substring(0, 8)}...</td>
              <td>{c.payload.amount}</td>
              <td title={c.payload.reason}>{c.payload.reason.substring(0, 20)}...</td>
              <td>{c.payload.buyer}</td>
              <td>{c.payload.seller}</td>
              <td>{getRole(c.payload)}</td>
              <td>
                {c.payload.agent === party && (
                  <>
                    <button className="button-small" onClick={() => exerciseChoice(Disputed.ResolveForSeller, c.contractId)}>Resolve for Seller</button>
                    <button className="button-small button-secondary" onClick={() => exerciseChoice(Disputed.ResolveForBuyer, c.contractId)}>Resolve for Buyer</button>
                  </>
                )}
              </td>
            </tr>
          )}
        />
      </div>
    </>
  ), [agreements, funded, delivered, disputed, party]);

  return (
    <div className="container">
      <header className="header">
        <h1>Escrow Dashboard</h1>
        <div className="user-info">
          <span>Logged in as: <strong>{party}</strong></span>
          <button className="button-secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {loading && <div className="loading">Loading contracts...</div>}

      <main className="dashboard">
        {disputingContract && (
          <DisputeForm
            contractId={disputingContract.contractId}
            onSubmit={handleDisputeSubmit}
            onCancel={() => setDisputingContract(null)}
          />
        )}
        {memoizedDashboard}
      </main>
    </div>
  );
};


// --- Helper Components --------------------------------------------------------

interface ContractTableProps {
  contracts: any[];
  columns: string[];
  renderRow: (contract: any) => React.ReactNode;
}

const ContractTable: React.FC<ContractTableProps> = ({ contracts, columns, renderRow }) => {
  if (contracts.length === 0) {
    return <p>No active contracts in this stage.</p>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {contracts.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
};


export default App;
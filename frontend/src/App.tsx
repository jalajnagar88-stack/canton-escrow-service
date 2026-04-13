import React, { useState, useCallback, useMemo } from 'react';
import { DamlLedger, useParty, useStreamQueries, useCommands } from '@c7/react';
import { ContractId } from '@c7/ledger';
import { Escrow } from '@daml.js/canton-escrow-service-0.1.0/lib/Escrow/V1';
import { createEscrow } from './escrowService';
import { EscrowStatus, EscrowStatusEnum } from './EscrowStatus';

const LEDGER_URL = 'http://localhost:7575';

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<{ party: string; token: string } | undefined>();

  const handleLogin = useCallback((party: string, token: string) => {
    setCredentials({ party, token });
  }, []);

  const handleLogout = useCallback(() => {
    setCredentials(undefined);
  }, []);

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DamlLedger token={credentials.token} party={credentials.party} httpBaseUrl={LEDGER_URL}>
      <MainView onLogout={handleLogout} />
    </DamlLedger>
  );
};

const LoginScreen: React.FC<{ onLogin: (party: string, token: string) => void }> = ({ onLogin }) => {
  const [party, setParty] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (party && token) {
      onLogin(party, token);
    }
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h1 style={styles.loginTitle}>Canton Escrow Service</h1>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="party" style={styles.label}>Party ID</label>
            <input
              id="party"
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              style={styles.input}
              placeholder="Enter your Party ID"
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="token" style={styles.label}>JWT Token</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={styles.input}
              placeholder="Paste your JWT"
            />
          </div>
          <button type="submit" style={styles.button} disabled={!party || !token}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const MainView: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const party = useParty();
  const { contracts, loading } = useStreamQueries(Escrow);
  const commands = useCommands();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEscrow, setNewEscrow] = useState({
    seller: '',
    agent: '',
    description: '',
    amount: '',
  });

  const { buyerContracts, sellerContracts, agentContracts } = useMemo(() => {
    return contracts.reduce(
      (acc, c) => {
        if (c.payload.buyer === party) acc.buyerContracts.push(c);
        if (c.payload.seller === party) acc.sellerContracts.push(c);
        if (c.payload.agent === party) acc.agentContracts.push(c);
        return acc;
      },
      { buyerContracts: [] as any[], sellerContracts: [] as any[], agentContracts: [] as any[] }
    );
  }, [contracts, party]);

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEscrow({
        ...newEscrow,
        buyer: party,
        amount: parseFloat(newEscrow.amount).toFixed(10),
      });
      setShowCreateForm(false);
      setNewEscrow({ seller: '', agent: '', description: '', amount: '' });
    } catch (error) {
      console.error('Failed to create escrow:', error);
      alert('Error: Could not create escrow contract.');
    }
  };

  const handleAction = async (cid: ContractId<Escrow>, choice: string, arg: any = {}) => {
    try {
      await commands.exercise(Escrow.choices[choice], cid, arg);
    } catch (error) {
      console.error(`Failed to exercise ${choice}:`, error);
      alert(`Error: Could not perform action ${choice}.`);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Escrow Dashboard</h1>
        <div style={styles.userInfo}>
          <span style={styles.partyId}>Logged in as: {party}</span>
          <button onClick={onLogout} style={{ ...styles.button, ...styles.logoutButton }}>
            Logout
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {loading ? (
          <p>Loading contracts...</p>
        ) : (
          <>
            <div style={styles.actionsHeader}>
              <h2 style={styles.sectionTitle}>My Escrows</h2>
              <button onClick={() => setShowCreateForm(!showCreateForm)} style={styles.button}>
                {showCreateForm ? 'Cancel' : '+ New Escrow'}
              </button>
            </div>
            {showCreateForm && (
              <div style={styles.card}>
                <form onSubmit={handleCreateEscrow}>
                  <h3 style={styles.formTitle}>Create New Escrow</h3>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}><label style={styles.label}>Seller Party</label><input style={styles.input} value={newEscrow.seller} onChange={e => setNewEscrow({...newEscrow, seller: e.target.value})} required/></div>
                    <div style={styles.formGroup}><label style={styles.label}>Agent Party</label><input style={styles.input} value={newEscrow.agent} onChange={e => setNewEscrow({...newEscrow, agent: e.target.value})} required/></div>
                    <div style={styles.formGroup}><label style={styles.label}>Amount (USD)</label><input style={styles.input} type="number" min="0.01" step="0.01" value={newEscrow.amount} onChange={e => setNewEscrow({...newEscrow, amount: e.target.value})} required/></div>
                  </div>
                  <div style={styles.formGroup}><label style={styles.label}>Description</label><input style={styles.input} value={newEscrow.description} onChange={e => setNewEscrow({...newEscrow, description: e.target.value})} required/></div>
                  <button type="submit" style={styles.button}>Create</button>
                </form>
              </div>
            )}
            <EscrowList title="As Buyer" contracts={buyerContracts} onAction={handleAction} role="buyer" />
            <EscrowList title="As Seller" contracts={sellerContracts} onAction={handleAction} role="seller" />
            <EscrowList title="As Agent" contracts={agentContracts} onAction={handleAction} role="agent" />
          </>
        )}
      </main>
    </div>
  );
};

interface EscrowListProps {
  title: string;
  contracts: any[];
  onAction: (cid: ContractId<Escrow>, choice: string, arg?: any) => void;
  role: 'buyer' | 'seller' | 'agent';
}

const EscrowList: React.FC<EscrowListProps> = ({ title, contracts, onAction, role }) => {
  if (contracts.length === 0) {
    return null;
  }

  return (
    <div style={styles.listContainer}>
      <h3 style={styles.listTitle}>{title}</h3>
      {contracts.map(({ contractId, payload }) => (
        <div key={contractId} style={styles.card}>
          <div style={styles.cardHeader}>
            <p style={styles.cardDescription}>{payload.description}</p>
            <p style={styles.cardAmount}>${payload.amount}</p>
          </div>
          <div style={styles.cardBody}>
            <p><strong>Status:</strong> <EscrowStatus status={payload.status as EscrowStatusEnum} /></p>
            <p><strong>Buyer:</strong> {payload.buyer}</p>
            <p><strong>Seller:</strong> {payload.seller}</p>
            <p><strong>Agent:</strong> {payload.agent}</p>
          </div>
          <div style={styles.cardActions}>
            {role === 'buyer' && payload.status === 'Created' && <button onClick={() => onAction(contractId, 'DepositFunds')} style={styles.button}>Deposit Funds</button>}
            {role === 'buyer' && payload.status === 'Funded' && <button onClick={() => onAction(contractId, 'ConfirmReceipt')} style={styles.button}>Confirm Receipt</button>}
            {role === 'seller' && payload.status === 'ReceiptConfirmed' && <button onClick={() => onAction(contractId, 'RequestRelease')} style={styles.button}>Request Release</button>}
            {(role === 'buyer' || role === 'seller') && ['Funded', 'ReceiptConfirmed', 'ReleaseRequested'].includes(payload.status) && <button onClick={() => onAction(contractId, 'Dispute', { reason: "Item not as described." })} style={{...styles.button, ...styles.dangerButton}}>Raise Dispute</button>}
            {role === 'agent' && payload.status === 'ReleaseRequested' && <button onClick={() => onAction(contractId, 'ReleaseFunds')} style={styles.button}>Release Funds</button>}
            {role === 'agent' && payload.status === 'Disputed' && <button onClick={() => onAction(contractId, 'ResolveDispute', { releaseToSeller: true })} style={styles.button}>Rule for Seller</button>}
            {role === 'agent' && payload.status === 'Disputed' && <button onClick={() => onAction(contractId, 'ResolveDispute', { releaseToSeller: false })} style={{...styles.button, ...styles.dangerButton}}>Rule for Buyer</button>}
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple CSS-in-JS for styling
const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  loginBox: { padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' },
  loginTitle: { textAlign: 'center', marginBottom: '24px', color: '#333' },
  container: { fontFamily: 'sans-serif', color: '#333' },
  header: { backgroundColor: '#fff', padding: '16px 32px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '24px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  partyId: { fontSize: '14px', color: '#555' },
  main: { padding: '32px' },
  actionsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { margin: 0 },
  listContainer: { marginTop: '24px' },
  listTitle: { borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' },
  card: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardDescription: { margin: 0, fontWeight: 'bold', fontSize: '18px' },
  cardAmount: { margin: 0, fontSize: '18px', color: '#0052cc' },
  cardBody: { fontSize: '14px', lineHeight: 1.5, color: '#444' },
  cardActions: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' },
  formTitle: { marginTop: 0, marginBottom: '16px' },
  formRow: { display: 'flex', gap: '16px', marginBottom: '16px' },
  formGroup: { flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '16px' },
  label: { marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  button: {
    backgroundColor: '#0052cc',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  logoutButton: { backgroundColor: '#555' },
  dangerButton: { backgroundColor: '#de350b' },
};

export default App;
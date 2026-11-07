import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { connectReceiptWallet, receiptWallets, signReceipt, watchReceiptWallets } from '../lib/solana-wallet.js';

const small = { fontSize:12.5, lineHeight:1.5, color:'var(--muted)', margin:0 };
const labels = { prepared:'Awaiting signature', pending:'Waiting for finalization', finalized:'Receipt confirmed', failed:'Transaction failed' };

export default function ReceiptPanel({ review }) {
  const [wallets,setWallets] = useState([]), [walletName,setWalletName] = useState('');
  const [receipts,setReceipts] = useState([]), [busy,setBusy] = useState(''), [error,setError] = useState('');
  const [verification,setVerification] = useState('');
  const live = useRef(true);
  const eligible = review.status === 'approved_for_demo' && review.target_type === 'run' && !review.blocking_reasons.length;
  const refreshWallets = () => {
    const available = receiptWallets();
    setWallets(available);
    setWalletName(current => available.some(wallet => wallet.name === current) ? current : available[0]?.name || '');
  };
  useEffect(() => {
    live.current = true;
    refreshWallets();
    const unsubscribe = watchReceiptWallets(refreshWallets);
    api.receipts(review.id).then(data => { if (live.current) setReceipts(data.receipts); }).catch(e => { if (live.current) setError(e.message); });
    return () => { live.current = false; unsubscribe(); };
  }, [review.id,review.version]);

  function update(receipt) {
    if (live.current) setReceipts(current => [receipt,...current.filter(item => item.id !== receipt.id)]);
  }
  async function check(receipt) {
    setError(''); setVerification(''); setBusy('Checking finalized Devnet evidence…');
    try {
      const current = await api.confirmReceipt(receipt.id);
      update(current);
      if (live.current && current.chain_check === 'not_found_at_finalized') setVerification('Transaction is not currently found at finalized commitment. It may still be pending.');
    } catch(e) { if (live.current) setError(e.message); }
    finally { if (live.current) setBusy(''); }
  }
  async function sign() {
    setError(''); setVerification(''); setBusy('Connecting your wallet…');
    try {
      const { wallet,account } = await connectReceiptWallet(walletName);
      if (!live.current) return;
      setBusy('Freezing this approved assessment…');
      const prepared = await api.prepareReceipt(review.id,review.version,account.address);
      if (!live.current) return;
      update(prepared);
      setBusy('Review the Devnet memo and fee in your wallet…');
      const signed = await signReceipt(wallet,account,prepared);
      if (!live.current) return;
      setBusy('Submitting your signed receipt…');
      let current = await api.submitReceipt(prepared.id,signed);
      update(current);
      // Bounded polling; an unfinished transaction remains pending and can be checked later.
      for (let attempt=0; live.current && current.status === 'pending' && attempt<5; attempt++) {
        setBusy('Waiting for Devnet finalization…');
        await new Promise(resolve => setTimeout(resolve,2000));
        if (!live.current) return;
        current = await api.confirmReceipt(prepared.id);
        update(current);
      }
    } catch(e) {
      if (live.current) setError(e.code === 4001 ? 'Wallet signing cancelled. No transaction was submitted.' : e.message || 'Receipt signing did not complete.');
    } finally { if (live.current) setBusy(''); }
  }
  async function retry(receipt) {
    setError(''); setVerification(''); setBusy('Retrying the same signed transaction…');
    try { update(await api.retryReceipt(receipt.id)); }
    catch(e) { if (live.current) setError(e.message); }
    finally { if (live.current) setBusy(''); }
  }
  async function download(receipt) {
    setError('');
    try {
      const bundle = await api.receiptBundle(receipt.id);
      if (!live.current) return;
      const url = URL.createObjectURL(new Blob([bundle.bundle_json],{type:'application/json;charset=utf-8'}));
      const link = document.createElement('a'); link.href=url; link.download=`${receipt.id}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch(e) { if (live.current) setError(e.message); }
  }
  async function verifyFile(receipt,file) {
    if (!file) return;
    setError(''); setVerification(''); setBusy('Verifying report bytes and Devnet receipt…');
    try {
      if (file.size > 4*1024*1024) throw new Error('Choose a frozen evidence bundle smaller than 4 MiB.');
      // Preserve a UTF-8 BOM as a character and reject invalid encodings, so
      // decoding cannot turn changed file bytes back into the original text.
      const text = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());
      if (!live.current) return;
      const result = await api.verifyReceipt(receipt.id,text);
      if (!live.current) return;
      update(result.receipt);
      setVerification(result.verified ? `Verified: this file matches receipt ${receipt.id} and its finalized transaction.${result.receipt.superseded ? ' This is an older review revision.' : ''}` : !result.bundle_matches ? 'Verification failed: this file differs from the signed evidence bundle.' : 'File matches, but a finalized transaction could not be verified now. Check confirmation again.');
    } catch(e) { if (live.current) setError(e.message); }
    finally { if (live.current) setBusy(''); }
  }
  return <section aria-label="Solana evidence receipts" style={{border:'1px solid var(--line)',borderRadius:14,padding:16,display:'flex',flexDirection:'column',gap:12,background:'var(--ground)'}}>
    <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
      <h3 className="h-d" style={{fontSize:18,margin:0}}>Signed evidence receipt</h3>
      <span className="pill p-info">Solana Devnet</span>
    </div>
    <p style={small}>Sign a fingerprint of this reviewed assessment. Your wallet keeps its private key. Only the receipt ID and fingerprint go on chain; Devnet SOL covers the transaction fee.</p>
    {eligible ? <>
      <label className="lbl" htmlFor={`receipt-wallet-${review.id}`}>Signing wallet</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select id={`receipt-wallet-${review.id}`} className="field" value={walletName} disabled={!!busy} onChange={event => setWalletName(event.target.value)} style={{flex:'1 1 160px',padding:10}}>
          {!wallets.length && <option value="">No compatible wallet detected</option>}
          {wallets.map(wallet => <option key={wallet.name} value={wallet.name}>{wallet.name}</option>)}
        </select>
        <button type="button" className="btn" disabled={!!busy} onClick={refreshWallets}>Refresh wallets</button>
        <button type="button" className="btn btn-p" disabled={!!busy || !walletName} onClick={sign}>Sign evidence receipt</button>
      </div>
      {!wallets.length && <p style={small}>Unlock a Solana wallet that supports Devnet, then refresh wallets.</p>}
    </> : <p style={small}>Signing is available after an unblocked saved calculation receives demo approval.</p>}
    {busy && <p role="status" style={small}>{busy}</p>}
    {error && <p role="alert" style={{...small,color:'var(--clay-ink)'}}>{error}</p>}
    {verification && <p role="status" style={small}>{verification}</p>}
    {receipts.map(receipt => <article key={receipt.id} style={{borderTop:'1px solid var(--line)',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <span className={`pill ${receipt.status === 'finalized' ? 'p-info' : receipt.status === 'failed' ? 'p-risk' : 'p-draft'}`}>{labels[receipt.status] || receipt.status}</span>
        <span style={small}>Review revision {receipt.review_version}{receipt.superseded ? ' · superseded' : ''}</span>
      </div>
      <span className="mono" style={{...small,overflowWrap:'anywhere'}}>SHA-256 {receipt.digest}</span>
      <span className="mono" style={{...small,overflowWrap:'anywhere'}}>Signing wallet {receipt.wallet}</span>
      {receipt.verification?.detail && <p style={small}>{receipt.verification.detail}</p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {receipt.signature && <button type="button" className="btn" disabled={!!busy} onClick={() => check(receipt)}>Check confirmation</button>}
        {receipt.signature && ['pending','failed'].includes(receipt.status) && <button type="button" className="btn" disabled={!!busy} onClick={() => retry(receipt)}>Retry same transaction</button>}
        <button type="button" className="btn" disabled={!!busy} onClick={() => download(receipt)}>Download frozen bundle</button>
        <label className="btn" style={{display:'inline-flex',alignItems:'center',gap:6}}>
          Verify a bundle file
          <input type="file" accept=".json,application/json" aria-label={`Verify bundle for ${receipt.id}`} disabled={!!busy} style={{maxWidth:180,fontSize:12}} onChange={event => { const file=event.target.files?.[0]; event.target.value=''; verifyFile(receipt,file); }} />
        </label>
        {receipt.explorer_url && <a className="ev" href={receipt.explorer_url} target="_blank" rel="noreferrer">View on Solana Explorer ↗</a>}
      </div>
    </article>)}
    <p style={small}>A receipt proves exact report bytes and wallet authorship. Scientific accuracy and analyst accreditation are separate; this remains a prototype review.</p>
  </section>;
}

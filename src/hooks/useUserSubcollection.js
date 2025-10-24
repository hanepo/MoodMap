// src/hooks/useUserSubcollection.js
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useUserSubcollection(uid, subcol, opts = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) { setItems([]); setLoading(false); return; }
    const q = query(collection(db, 'users', uid, subcol), ...(opts.orderBy ? [orderBy(opts.orderBy, opts.dir || 'desc')] : []));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.warn('useUserSubcollection err', err);
      setLoading(false);
    });
    return () => unsub();
  }, [uid, subcol, opts.orderBy, opts.dir]);
  return { items, loading };
}

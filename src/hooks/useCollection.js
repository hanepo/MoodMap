// src/hooks/useCollection.js
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useCollection(collName, opts = {}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, collName), ...(opts.orderBy ? [orderBy(opts.orderBy, opts.dir || 'desc')] : []));
    const unsub = onSnapshot(q, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDocs(arr);
      setLoading(false);
    }, err => {
      console.warn('useCollection err', err);
      setLoading(false);
    });
    return () => unsub();
  }, [collName, opts.orderBy, opts.dir]);
  return { docs, loading };
}

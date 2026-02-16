import { useState, useEffect, useCallback } from 'react';
import Parse from '../config/parse';

interface UseParseQueryOptions {
  className: string;
  businessId?: string;
  limit?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  includes?: string[];
  filters?: Record<string, any>;
}

interface UseParseQueryResult {
  data: any[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (fields: Record<string, any>) => Promise<any>;
  update: (objectId: string, fields: Record<string, any>) => Promise<any>;
  remove: (objectId: string) => Promise<void>;
}

export function useParseQuery(options: UseParseQueryOptions): UseParseQueryResult {
  const { className, businessId, limit = 20, skip = 0, orderBy = 'createdAt', orderDirection = 'desc', includes = [], filters = {} } = options;
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new Parse.Query(className);
      query.limit(limit);
      query.skip(skip);
      if (orderDirection === 'desc') query.descending(orderBy);
      else query.ascending(orderBy);
      includes.forEach(inc => query.include(inc));
      if (businessId) {
        const bPtr = new Parse.Object('Business');
        bPtr.id = businessId;
        query.equalTo('business', bPtr);
      }
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== '' && val !== null) {
          query.equalTo(key, val);
        }
      });

      const [results, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true }),
      ]);

      setData(results.map((r: any) => ({ ...r.toJSON(), _parseObj: r })));
      setCount(total);
    } catch (err: any) {
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [className, businessId, limit, skip, orderBy, orderDirection, JSON.stringify(filters), JSON.stringify(includes)]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (fields: Record<string, any>) => {
    const obj = new Parse.Object(className);
    if (businessId) {
      const bPtr = new Parse.Object('Business');
      bPtr.id = businessId;
      obj.set('business', bPtr);
    }
    Object.entries(fields).forEach(([k, v]) => {
      if (k === 'business' && typeof v === 'string') {
        const ptr = new Parse.Object('Business');
        ptr.id = v;
        obj.set(k, ptr);
      } else {
        obj.set(k, v);
      }
    });
    const result = await obj.save(null, { useMasterKey: true });
    await fetch();
    return result;
  };

  const update = async (objectId: string, fields: Record<string, any>) => {
    const query = new Parse.Query(className);
    const obj = await query.get(objectId, { useMasterKey: true });
    Object.entries(fields).forEach(([k, v]) => {
      if (k === 'business' && typeof v === 'string') {
        const ptr = new Parse.Object('Business');
        ptr.id = v;
        obj.set(k, ptr);
      } else {
        obj.set(k, v);
      }
    });
    const result = await obj.save(null, { useMasterKey: true });
    await fetch();
    return result;
  };

  const remove = async (objectId: string) => {
    const query = new Parse.Query(className);
    const obj = await query.get(objectId, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    await fetch();
  };

  return { data, count, loading, error, refetch: fetch, create, update, remove };
}

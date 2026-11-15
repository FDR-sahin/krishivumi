import dns from 'node:dns';
import { MongoClient, Db } from 'mongodb';

const dbName = process.env.MONGO_DB_NAME || 'krishivumi_erp';

declare global {
  var __krishiMongoClientPromiseV2: Promise<MongoClient> | undefined;
  var __krishiIndexesEnsuredV2: boolean | undefined;
}

async function resolveSrvUri(srvUri: string): Promise<string> {
  const parsed = new URL(srvUri);
  const host = parsed.hostname;

  const resolver = new dns.promises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  if (!srvRecords || srvRecords.length === 0) {
    throw new Error(`No SRV records found for _mongodb._tcp.${host}`);
  }

  let txtParams = '';
  try {
    const txtRecords = await resolver.resolveTxt(host);
    if (txtRecords && txtRecords.length > 0) {
      txtParams = txtRecords.map((chunks) => chunks.join('')).join('&');
    }
  } catch {
    // TXT record is optional
  }

  const seeds = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');
  const mergedParams = new URLSearchParams(txtParams);
  parsed.searchParams.forEach((value, key) => {
    mergedParams.set(key, value);
  });
  if (!mergedParams.has('tls') && !mergedParams.has('ssl')) {
    mergedParams.set('tls', 'true');
  }

  const authPart =
    parsed.username || parsed.password
      ? `${parsed.username}:${parsed.password}@`
      : '';
  const pathname = parsed.pathname || '/';
  const qs = mergedParams.toString();
  return `mongodb://${authPart}${seeds}${pathname}${qs ? `?${qs}` : ''}`;
}

async function connectMongo(): Promise<MongoClient> {
  const uri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('MONGO_URI is not configured in environment variables.');
  }

  let effectiveUri = uri;
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      dns.promises.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore if environment disallows overriding global DNS servers
    }
    try {
      effectiveUri = await resolveSrvUri(uri);
    } catch {
      effectiveUri = uri;
    }
  }

  const client = new MongoClient(effectiveUri, { serverSelectionTimeoutMS: 8000 });
  return await client.connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (!globalThis.__krishiMongoClientPromiseV2) {
    globalThis.__krishiMongoClientPromiseV2 = connectMongo().catch((err) => {
      globalThis.__krishiMongoClientPromiseV2 = undefined;
      throw err;
    });
  }
  return globalThis.__krishiMongoClientPromiseV2;
}

async function ensureIndexes(db: Db): Promise<void> {
  if (globalThis.__krishiIndexesEnsuredV2) return;
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    // Database-level enforcement: strictly ONE super_admin allowed across the entire ERP
    await db.collection('users').createIndex(
      { role: 1 },
      {
        unique: true,
        partialFilterExpression: { role: 'super_admin' },
      }
    );

    const ownerCollections = [
      'businesses',
      'accounts',
      'journal_entries',
      'inventory',
      'stock_movements',
      'stakeholders',
      'poultry_batches',
      'livestock_records',
      'fish_cycles',
      'transport_ops',
      'notifications',
      'audit_logs',
      'users',
    ];
    await Promise.all(
      ownerCollections.map((col) => db.collection(col).createIndex({ ownerId: 1 }))
    );
    globalThis.__krishiIndexesEnsuredV2 = true;
  } catch (err) {
    console.error('MongoDB index initialization warning:', err);
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}

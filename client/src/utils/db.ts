import { Pool } from 'pg';
import dynamicRoutes from './dynamic_routes.json';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Helper: Map DB column names to JS keys
function mapColToKey(col: string): string {
  if (col === 'patient_name') return 'patientName';
  if (col === 'doctor_name') return 'doctorName';
  if (col === 'test_type') return 'testType';
  if (col === 'test_date') return 'testDate';
  if (col === 'delivery_time') return 'deliveryTime';
  return col;
}

// Helper: Map JS keys back to DB column names
function mapKeyToCol(key: string): string {
  if (key === 'patientName') return 'patient_name';
  if (key === 'doctorName') return 'doctor_name';
  if (key === 'testType') return 'test_type';
  if (key === 'testDate') return 'test_date';
  if (key === 'deliveryTime') return 'delivery_time';
  return key;
}

function mapRow(row: any, tableName: string): any {
  if (!row) return null;
  const doc: any = {};
  for (const [col, val] of Object.entries(row)) {
    if (col === 'id') {
      doc.id = val;
      doc._id = val; // Legacy alias for frontend compatibility
    } else if (col === 'created_at') {
      doc.createdAt = val;
    } else if (col === 'updated_at') {
      doc.updatedAt = val;
    } else {
      doc[mapColToKey(col)] = val;
    }
  }
  return doc;
}

// Fields metadata for table schemas
const tableFields: Record<string, string[]> = {
  patients: ['name', 'condition', 'admission', 'status', 'img', 'gender', 'age', 'email'],
  appointments: ['name', 'doctor', 'dept', 'time', 'date', 'status', 'img', 'gender', 'age', 'email'],
  transactions: ['patient_name', 'type', 'amount', 'method', 'date', 'gender', 'age', 'email'],
  beds: ['id', 'ward', 'status', 'patient', 'diagnosis', 'timer', 'gender', 'age'],
  surgeries: ['room', 'patient_name', 'surgeon', 'procedure', 'time', 'status', 'img', 'gender', 'age'],
  invoices: ['patient_name', 'dept', 'services', 'amount', 'date', 'status', 'gender', 'age'],
  medications: ['name', 'category', 'dosage', 'sku', 'quantity', 'status'],
  prescriptions: ['patient_name', 'drug', 'dosage', 'date', 'status'],
  reports: ['name', 'category', 'date', 'size', 'author'],
  doctors: ['name', 'dept', 'status', 'img', 'gender', 'age', 'email', 'schedule'],
  staff: ['name', 'role', 'dept', 'status', 'img', 'gender', 'age', 'email', 'shift'],
  notifications: ['text', 'type', 'time', 'read'],
  pantry_orders: ['patient_name', 'room', 'item', 'quantity', 'status', 'delivery_time'],
  diagnoses: ['patient_name', 'age', 'gender', 'doctor_name', 'test_type', 'test_date', 'results', 'status']
};

// Apply build-time dynamic routes fields schema metadata
for (const tableName of dynamicRoutes.dynamicTables) {
  tableFields[tableName] = ['name', 'status', 'details'];
}

class QueryBuilder {
  tableName: string;
  whereClause: Record<string, any>;
  orderBy: string;
  limitVal: number | null;

  constructor(tableName: string, whereClause = {}) {
    this.tableName = tableName;
    this.whereClause = whereClause;
    this.orderBy = '';
    this.limitVal = null;
  }

  sort(sortObj: Record<string, number>): this {
    const keys = Object.keys(sortObj);
    if (keys.length > 0) {
      const key = keys[0];
      const dir = sortObj[key] === -1 ? 'DESC' : 'ASC';
      const col = key === 'createdAt' ? 'created_at' : mapKeyToCol(key);
      this.orderBy = `ORDER BY "${col}" ${dir}`;
    }
    return this;
  }

  limit(val: number): this {
    this.limitVal = val;
    return this;
  }

  async execute(): Promise<any[]> {
    let sql = `SELECT * FROM "${this.tableName}"`;
    const clauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(this.whereClause)) {
      const col = key === 'id' ? 'id' : (key === '_id' ? 'id' : mapKeyToCol(key));
      clauses.push(`"${col}" = $${idx++}`);
      params.push(val);
    }

    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    if (this.orderBy) {
      sql += ` ${this.orderBy}`;
    }

    if (this.limitVal !== null) {
      sql += ` LIMIT ${this.limitVal}`;
    }

    const result = await pool.query(sql, params);
    return result.rows.map(row => mapRow(row, this.tableName));
  }

  then(onfulfilled?: (value: any[]) => any, onrejected?: (reason: any) => any): Promise<any> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class Model {
  _tableName: string;
  id?: string;
  _id?: string;
  [key: string]: any;

  constructor(tableName: string, data = {}) {
    this._tableName = tableName;
    Object.assign(this, data);
  }

  async save(): Promise<this> {
    const fields = tableFields[this._tableName];
    const values: any[] = [];
    const cols: string[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    const existingId = this.id || this._id;
    let exists = false;
    if (existingId) {
      const checkRes = await pool.query(`SELECT 1 FROM "${this._tableName}" WHERE id = $1`, [existingId]);
      exists = (checkRes.rowCount ?? 0) > 0;
    }

    if (exists) {
      const sets: string[] = [];
      const params: any[] = [];
      let pIdx = 1;
      for (const f of fields) {
        if (f === 'id') continue;
        const key = mapColToKey(f);
        if (this[key] !== undefined) {
          sets.push(`"${f}" = $${pIdx++}`);
          params.push(this[key]);
        }
      }
      params.push(existingId);
      const sql = `UPDATE "${this._tableName}" SET ${sets.join(', ')} WHERE id = $${pIdx} RETURNING *`;
      const res = await pool.query(sql, params);
      Object.assign(this, mapRow(res.rows[0], this._tableName));
    } else {
      if (this._tableName === 'beds' && this.id) {
        cols.push('"id"');
        placeholders.push(`$${idx++}`);
        values.push(this.id);
      }
      for (const f of fields) {
        if (f === 'id') continue;
        const key = mapColToKey(f);
        if (this[key] !== undefined) {
          cols.push(`"${f}"`);
          placeholders.push(`$${idx++}`);
          values.push(this[key]);
        }
      }
      const sql = `INSERT INTO "${this._tableName}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const res = await pool.query(sql, values);
      Object.assign(this, mapRow(res.rows[0], this._tableName));
    }
    return this;
  }
}

function makeModelInterface(tableName: string) {
  const modelInterface = function(this: any, data: any) {
    if (new.target) {
      return new Model(tableName, data);
    }
    return new Model(tableName, data);
  } as any;

  modelInterface.find = function(query = {}) {
    return new QueryBuilder(tableName, query);
  };

  modelInterface.findById = async function(id: string) {
    const sql = `SELECT * FROM "${tableName}" WHERE id = $1`;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    return new Model(tableName, mapRow(res.rows[0], tableName));
  };

  modelInterface.findByIdAndDelete = async function(id: string) {
    const sql = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *`;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    return mapRow(res.rows[0], tableName);
  };

  modelInterface.findByIdAndUpdate = async function(id: string, update: Record<string, any>, options = {}) {
    const sets: string[] = [];
    const params: any[] = [id];
    let idx = 2;
    for (const [key, val] of Object.entries(update)) {
      const col = mapKeyToCol(key);
      sets.push(`"${col}" = $${idx++}`);
      params.push(val);
    }
    const sql = `UPDATE "${tableName}" SET ${sets.join(', ')} WHERE id = $1 RETURNING *`;
    const res = await pool.query(sql, params);
    if (res.rowCount === 0) return null;
    return new Model(tableName, mapRow(res.rows[0], tableName));
  };

  modelInterface.findOneAndUpdate = async function(query: Record<string, any>, update: Record<string, any>, options = {}) {
    const clauses: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(query)) {
      const col = key === 'id' ? 'id' : (key === '_id' ? 'id' : mapKeyToCol(key));
      clauses.push(`"${col}" = $${idx++}`);
      params.push(val);
    }
    const sets: string[] = [];
    for (const [key, val] of Object.entries(update)) {
      const col = mapKeyToCol(key);
      sets.push(`"${col}" = $${idx++}`);
      params.push(val);
    }
    const sql = `UPDATE "${tableName}" SET ${sets.join(', ')} WHERE ${clauses.join(' AND ')} RETURNING *`;
    const res = await pool.query(sql, params);
    if (res.rowCount === 0) return null;
    return new Model(tableName, mapRow(res.rows[0], tableName));
  };

  modelInterface.countDocuments = async function(query = {}) {
    let sql = `SELECT COUNT(*) FROM "${tableName}"`;
    const clauses: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(query)) {
      const col = key === 'id' ? 'id' : (key === '_id' ? 'id' : mapKeyToCol(key));
      clauses.push(`"${col}" = $${idx++}`);
      params.push(val);
    }
    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    const res = await pool.query(sql, params);
    return parseInt(res.rows[0].count);
  };

  modelInterface.insertMany = async function(arr: any[]) {
    for (const item of arr) {
      const m = new Model(tableName, item);
      await m.save();
    }
    return arr;
  };

  return modelInterface;
}

// Database schema setup DDL statements
export async function dbInit() {
  console.log('[Supabase DB] Initializing PostgreSQL schemas...');
  try {
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('[Supabase DB] pgvector extension active');
    } catch (e: any) {
      console.warn('[Supabase DB] Warning: pgvector extension not created:', e.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        condition TEXT NOT NULL,
        admission TEXT DEFAULT 'Just now',
        status TEXT DEFAULT 'Pending',
        img TEXT,
        gender TEXT,
        age INTEGER,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        doctor TEXT NOT NULL,
        dept TEXT NOT NULL,
        "time" TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed',
        img TEXT,
        gender TEXT,
        age INTEGER,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        method TEXT NOT NULL,
        date TEXT NOT NULL,
        gender TEXT,
        age INTEGER,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS beds (
        id TEXT PRIMARY KEY,
        ward TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        patient TEXT,
        diagnosis TEXT,
        timer INTEGER,
        gender TEXT,
        age INTEGER
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS surgeries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        surgeon TEXT NOT NULL,
        procedure TEXT NOT NULL,
        "time" TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        img TEXT,
        gender TEXT,
        age INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_name TEXT NOT NULL,
        dept TEXT NOT NULL,
        services TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        gender TEXT,
        age INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        dosage TEXT NOT NULL,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT DEFAULT 'In Stock',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_name TEXT NOT NULL,
        drug TEXT NOT NULL,
        dosage TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'dispensed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        size TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        img TEXT,
        gender TEXT,
        age INTEGER,
        email TEXT,
        schedule TEXT DEFAULT '08:00 - 16:00',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        dept TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        img TEXT,
        gender TEXT,
        age INTEGER,
        email TEXT,
        shift TEXT DEFAULT 'Day Shift',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        "time" TEXT DEFAULT 'Just now',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pantry_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_name TEXT NOT NULL,
        room TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Pending',
        delivery_time TEXT DEFAULT 'ASAP',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        test_type TEXT NOT NULL,
        test_date TEXT NOT NULL,
        results TEXT NOT NULL,
        status TEXT DEFAULT 'Completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_vectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT,
        embedding vector(3072),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dynamic tables generated at build-time
    for (const tableName of dynamicRoutes.dynamicTables) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT,
            status TEXT,
            details JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log(`[Supabase DB] Dynamic table "${tableName}" active`);
      } catch (err: any) {
        console.error(`[Supabase DB] Failed to create dynamic table "${tableName}":`, err.message);
      }
    }

    console.log('[Supabase DB] Tables initialized successfully');
  } catch (error) {
    console.error('[Supabase DB] Migration error:', error);
  }
}

export const Patient = makeModelInterface('patients');
export const Appointment = makeModelInterface('appointments');
export const Transaction = makeModelInterface('transactions');
export const Bed = makeModelInterface('beds');
export const Surgery = makeModelInterface('surgeries');
export const Invoice = makeModelInterface('invoices');
export const Medication = makeModelInterface('medications');
export const Prescription = makeModelInterface('prescriptions');
export const Report = makeModelInterface('reports');
export const Doctor = makeModelInterface('doctors');
export const Staff = makeModelInterface('staff');
export const NotificationModel = makeModelInterface('notifications');
export const PantryOrder = makeModelInterface('pantry_orders');
export const Diagnosis = makeModelInterface('diagnoses');

// Export dynamically built models
const exportsMap: Record<string, any> = {};
for (const [modelName, tableName] of Object.entries(dynamicRoutes.dynamicModels)) {
  exportsMap[modelName] = makeModelInterface(tableName as string);
}

export const getDynamicModel = (modelName: string) => exportsMap[modelName];
export { pool };

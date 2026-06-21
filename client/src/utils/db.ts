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

export function mapRow(row: any, tableName: string): any {
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
  diagnoses: ['patient_name', 'age', 'gender', 'doctor_name', 'test_type', 'test_date', 'results', 'status'],
  pantry_inventory: ['name', 'stock', 'unit'],
  dashboard_pages: ['name', 'href', 'icon', 'subtitle', 'status', 'order_index']
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pantry_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        stock INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'plates',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        href TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        subtitle TEXT,
        status TEXT DEFAULT 'active',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed dashboard pages if empty
    const checkPages = await pool.query('SELECT COUNT(*) FROM dashboard_pages');
    if (parseInt(checkPages.rows[0].count) === 0) {
      console.log('[Supabase DB] Seeding default dashboard navigation pages...');
      const defaultPages = [
        { name: 'Dashboard', href: '/admin-dashboard', icon: 'LayoutDashboard', subtitle: 'Clinical Command Center', order_index: 1 },
        { name: 'Appointments', href: '/admin-dashboard/appointments', icon: 'Calendar', subtitle: 'Patient Intake & Scheduling', order_index: 2 },
        { name: 'Bed Availability', href: '/admin-dashboard/bed-availability', icon: 'Bed', subtitle: 'Bed Occupancy & Sanitation', order_index: 3 },
        { name: 'OT', href: '/admin-dashboard/ot', icon: 'Scissors', subtitle: 'Surgical Suites & Cases', order_index: 4 },
        { name: 'Doctor', href: '/admin-dashboard/doctor', icon: 'User', subtitle: 'Physician Registry', order_index: 5 },
        { name: 'Patients', href: '/admin-dashboard/patients', icon: 'Users', subtitle: 'Admitted Patients', order_index: 6 },
        { name: 'Staff', href: '/admin-dashboard/staff', icon: 'Briefcase', subtitle: 'Clinical Personnel Shifts', order_index: 7 },
        { name: 'Pharmacy', href: '/admin-dashboard/pharmacy', icon: 'Pill', subtitle: 'Medications & Stock', order_index: 8 },
        { name: 'Diagnosis', href: '/admin-dashboard/diagnosis', icon: 'Activity', subtitle: 'Laboratory Results', order_index: 9 },
        { name: 'Pantry', href: '/admin-dashboard/pantry', icon: 'Utensils', subtitle: 'Diet & Meals', order_index: 10 },
        { name: 'Billing', href: '/admin-dashboard/billing', icon: 'DollarSign', subtitle: 'Patient Ledger', order_index: 11 },
        { name: 'Revenue', href: '/admin-dashboard/revenue', icon: 'TrendingUp', subtitle: 'Revenue Telemetry', order_index: 12 },
        { name: 'Reports', href: '/admin-dashboard/reports', icon: 'BarChart', subtitle: 'Medical Records & Docs', order_index: 13 }
      ];
      for (const p of defaultPages) {
        await pool.query(
          'INSERT INTO dashboard_pages (name, href, icon, subtitle, order_index) VALUES ($1, $2, $3, $4, $5)',
          [p.name, p.href, p.icon, p.subtitle, p.order_index]
        );
      }
      console.log('[Supabase DB] Seeding default pages complete');
    }

    // Seed 570 beds if beds table is empty
    const checkBeds = await pool.query('SELECT COUNT(*) FROM beds');
    if (parseInt(checkBeds.rows[0].count) === 0) {
      console.log('[Supabase DB] Seeding 570 hospital beds...');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // 50 ICU beds
        for (let i = 1; i <= 50; i++) {
          const id = `ICU-${String(i).padStart(2, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'ICU', 'available', '', '', 0]
          );
        }
        
        // 20 VIP suite rooms
        for (let i = 1; i <= 20; i++) {
          const id = `VIP-${String(i).padStart(2, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'VIP', 'available', '', '', 0]
          );
        }
        
        // 200 Men\'s Ward beds (normal, under General ward)
        for (let i = 1; i <= 200; i++) {
          const id = `M-${String(i).padStart(3, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'General', 'available', '', '', 0]
          );
        }

        // 200 Women\'s Ward beds (normal, under General ward)
        for (let i = 1; i <= 200; i++) {
          const id = `W-${String(i).padStart(3, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'General', 'available', '', '', 0]
          );
        }

        // 50 ER beds (normal, under ER ward)
        for (let i = 1; i <= 50; i++) {
          const id = `ER-${String(i).padStart(2, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'ER', 'available', '', '', 0]
          );
        }

        // 50 Pediatric beds (normal, under Pediatrics ward)
        for (let i = 1; i <= 50; i++) {
          const id = `PED-${String(i).padStart(2, '0')}`;
          await client.query(
            'INSERT INTO beds (id, ward, status, patient, diagnosis, timer) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, 'Pediatrics', 'available', '', '', 0]
          );
        }

        await client.query('COMMIT');
        console.log('[Supabase DB] 570 beds seeded successfully');
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('[Supabase DB] Failed to seed beds:', e);
      } finally {
        client.release();
      }
    }

    // Seed pantry items if pantry_inventory table is empty
    const checkPantry = await pool.query('SELECT COUNT(*) FROM pantry_inventory');
    if (parseInt(checkPantry.rows[0].count) === 0) {
      console.log('[Supabase DB] Seeding pantry food inventory items...');
      const defaultItems = [
        { name: 'Chicken Meal', stock: 100, unit: 'plates' },
        { name: 'Veg Meal', stock: 100, unit: 'plates' },
        { name: 'Soup', stock: 150, unit: 'plates' },
        { name: 'Idly', stock: 200, unit: 'plates' },
        { name: 'Fried Rice (Chicken)', stock: 80, unit: 'plates' },
        { name: 'Fried Rice (Veg)', stock: 80, unit: 'plates' },
        { name: 'Tea', stock: 300, unit: 'cups' },
        { name: 'Coffee', stock: 300, unit: 'cups' },
        { name: 'Cookies', stock: 500, unit: 'pieces' }
      ];
      for (const item of defaultItems) {
        await pool.query(
          'INSERT INTO pantry_inventory (name, stock, unit) VALUES ($1, $2, $3)',
          [item.name, item.stock, item.unit]
        );
      }
      console.log('[Supabase DB] Pantry food inventory seeded successfully');
    }

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
export const PantryInventory = makeModelInterface('pantry_inventory');
export const DashboardPage = makeModelInterface('dashboard_pages');

// Export dynamically built models
const exportsMap: Record<string, any> = {};
for (const [modelName, tableName] of Object.entries(dynamicRoutes.dynamicModels)) {
  exportsMap[modelName] = makeModelInterface(tableName as string);
}

export const getDynamicModel = (modelName: string) => exportsMap[modelName];
export { pool };

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Helper: Map DB column names to JS keys
function mapColToKey(col) {
  if (col === 'patient_name') return 'patientName';
  if (col === 'doctor_name') return 'doctorName';
  if (col === 'test_type') return 'testType';
  if (col === 'test_date') return 'testDate';
  if (col === 'delivery_time') return 'deliveryTime';
  return col;
}

// Helper: Map JS keys back to DB column names
function mapKeyToCol(key) {
  if (key === 'patientName') return 'patient_name';
  if (key === 'doctorName') return 'doctor_name';
  if (key === 'testType') return 'test_type';
  if (key === 'testDate') return 'test_date';
  if (key === 'deliveryTime') return 'delivery_time';
  return key;
}

function mapRow(row, tableName) {
  if (!row) return null;
  const doc = {};
  for (const [col, val] of Object.entries(row)) {
    if (col === 'id') {
      doc.id = val;
      doc._id = val; // Mongoose compatibility
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
const tableFields = {
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

class QueryBuilder {
  constructor(tableName, whereClause = {}) {
    this.tableName = tableName;
    this.whereClause = whereClause;
    this.orderBy = '';
    this.limitVal = null;
  }

  sort(sortObj) {
    const keys = Object.keys(sortObj);
    if (keys.length > 0) {
      const key = keys[0];
      const dir = sortObj[key] === -1 ? 'DESC' : 'ASC';
      const col = key === 'createdAt' ? 'created_at' : mapKeyToCol(key);
      this.orderBy = `ORDER BY "${col}" ${dir}`;
    }
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  async execute() {
    let sql = `SELECT * FROM "${this.tableName}"`;
    const clauses = [];
    const params = [];
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

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Generic Model Builder class mapping Mongoose API
class Model {
  constructor(tableName, data = {}) {
    this._tableName = tableName;
    Object.assign(this, data);
  }

  async save() {
    const fields = tableFields[this._tableName];
    const values = [];
    const cols = [];
    const placeholders = [];
    let idx = 1;

    const existingId = this.id || this._id;
    let exists = false;
    if (existingId) {
      const checkRes = await pool.query(`SELECT 1 FROM "${this._tableName}" WHERE id = $1`, [existingId]);
      exists = checkRes.rowCount > 0;
    }

    if (exists) {
      const sets = [];
      const params = [];
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

function makeModelInterface(tableName) {
  const modelInterface = function(data) {
    return new Model(tableName, data);
  };

  modelInterface.find = function(query = {}) {
    return new QueryBuilder(tableName, query);
  };

  modelInterface.findById = async function(id) {
    const sql = `SELECT * FROM "${tableName}" WHERE id = $1`;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    return new Model(tableName, mapRow(res.rows[0], tableName));
  };

  modelInterface.findByIdAndDelete = async function(id) {
    const sql = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *`;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    return mapRow(res.rows[0], tableName);
  };

  modelInterface.findByIdAndUpdate = async function(id, update, options = {}) {
    const sets = [];
    const params = [id];
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

  modelInterface.findOneAndUpdate = async function(query, update, options = {}) {
    const clauses = [];
    const params = [];
    let idx = 1;
    for (const [key, val] of Object.entries(query)) {
      const col = key === 'id' ? 'id' : (key === '_id' ? 'id' : mapKeyToCol(key));
      clauses.push(`"${col}" = $${idx++}`);
      params.push(val);
    }
    const sets = [];
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
    const clauses = [];
    const params = [];
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

  modelInterface.insertMany = async function(arr) {
    for (const item of arr) {
      const m = new Model(tableName, item);
      await m.save();
    }
    return arr;
  };

  return modelInterface;
}

// Database schema setup DDL statements
async function dbInit() {
  console.log('[Supabase DB] Initializing PostgreSQL schemas...');
  try {
    // Try to install vector extension
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('[Supabase DB] pgvector extension active');
    } catch (e) {
      console.warn('[Supabase DB] Warning: pgvector extension not created (might already exist or permission restricted):', e.message);
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

    console.log('[Supabase DB] Tables initialized successfully');
    
    // Seed initial records if database is empty
    await seedDatabase();
  } catch (error) {
    console.error('[Supabase DB] Migration error:', error);
  }
}

async function seedDatabase() {
  const Patient = makeModelInterface('patients');
  const Appointment = makeModelInterface('appointments');
  const Transaction = makeModelInterface('transactions');
  const Bed = makeModelInterface('beds');
  const Surgery = makeModelInterface('surgeries');
  const Invoice = makeModelInterface('invoices');
  const Medication = makeModelInterface('medications');
  const Prescription = makeModelInterface('prescriptions');
  const Report = makeModelInterface('reports');
  const Doctor = makeModelInterface('doctors');
  const Staff = makeModelInterface('staff');
  const NotificationModel = makeModelInterface('notifications');
  const PantryOrder = makeModelInterface('pantry_orders');
  const Diagnosis = makeModelInterface('diagnoses');

  try {
    const bedCount = await Bed.countDocuments();
    if (bedCount === 0) {
      const beds = [
        { id: "ICU-01", ward: "ICU", status: "occupied", patient: "Arthur Morgan", diagnosis: "Post-OP Cardiology" },
        { id: "ICU-02", ward: "ICU", status: "occupied", patient: "Joel Miller", diagnosis: "Fracture (L2) Traction" },
        { id: "ICU-03", ward: "ICU", status: "available", patient: "", diagnosis: "" },
        { id: "ER-01", ward: "ER", status: "occupied", patient: "Elena Fisher", diagnosis: "Acute Viral Dehydration" },
        { id: "ER-02", ward: "ER", status: "cleaning", patient: "", diagnosis: "", timer: 3 },
        { id: "ER-03", ward: "ER", status: "available", patient: "", diagnosis: "" },
        { id: "ER-04", ward: "ER", status: "available", patient: "", diagnosis: "" },
        { id: "GW-101", ward: "General", status: "occupied", patient: "Leo Vance", diagnosis: "Hypertension Monitoring" },
        { id: "GW-102", ward: "General", status: "occupied", patient: "John Marston", diagnosis: "Respiratory Therapy" },
        { id: "GW-103", ward: "General", status: "cleaning", patient: "", diagnosis: "", timer: 8 },
        { id: "GW-104", ward: "General", status: "available", patient: "", diagnosis: "" },
        { id: "GW-105", ward: "General", status: "available", patient: "", diagnosis: "" },
      ];
      await Bed.insertMany(beds);
      console.log('[Supabase DB] Beds seeded');
    }

    const surgeryCount = await Surgery.countDocuments();
    if (surgeryCount === 0) {
      const surgeries = [
        { room: "OT Suite 1", patientName: "Arthur Morgan", surgeon: "Dr. Aisha Khan", procedure: "Coronary Bypass", time: "08:00 - 12:30", status: "in progress", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw" },
        { room: "OT Suite 3", patientName: "Elena Fisher", surgeon: "Dr. Sarah Jenkins", procedure: "Appendectomy", time: "10:00 - 11:30", status: "in progress", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik" },
        { room: "OT Suite 2", patientName: "Leo Vance", surgeon: "Dr. Helena Troy", procedure: "Craniotomy", time: "01:30 - 04:30", status: "scheduled", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg" }
      ];
      await Surgery.insertMany(surgeries);
      console.log('[Supabase DB] Surgeries seeded');
    }

    const invoiceCount = await Invoice.countDocuments();
    if (invoiceCount === 0) {
      const invoices = [
        { patientName: "Arthur Morgan", dept: "Cardiology", services: "Coronary Angioplasty", amount: 12400, date: "2024-02-20", status: "Paid" },
        { patientName: "Elena Fisher", dept: "Gen Medicine", services: "Inpatient Ward Stay (2 Days)", amount: 1850, date: "2024-02-23", status: "Pending" },
        { patientName: "Joel Miller", dept: "Emergency", services: "Trauma Resuscitation & Stitching", amount: 4200, date: "2024-02-10", status: "Overdue" },
        { patientName: "Leo Vance", dept: "Neurology", services: "MRI Brain & EEG Telemetry", amount: 3150, date: "2024-02-22", status: "Paid" }
      ];
      await Invoice.insertMany(invoices);
      console.log('[Supabase DB] Invoices seeded');
    }

    const transactionCount = await Transaction.countDocuments();
    if (transactionCount === 0) {
      const transactions = [
        { patientName: "Arthur Morgan", type: "Insurance", amount: 11160, method: "ACH Transfer", date: "2024-02-23" },
        { patientName: "Elena Fisher", type: "Copay", amount: 35, method: "Credit Card", date: "2024-02-24" },
        { patientName: "Joel Miller", type: "Direct", amount: 1200, method: "Direct Debit", date: "2024-02-18" }
      ];
      await Transaction.insertMany(transactions);
      console.log('[Supabase DB] Transactions seeded');
    }

    const patientCount = await Patient.countDocuments();
    if (patientCount === 0) {
      const patients = [
        { name: "Arthur Morgan", condition: "Hypertension", admission: "Feb 20, 14:30", status: "Stable", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw" },
        { name: "Elena Fisher", condition: "Acute Viral", admission: "Feb 21, 09:15", status: "Treatment", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik" },
        { name: "Joel Miller", condition: "Fracture (L2)", admission: "Feb 21, 11:45", status: "Urgent", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0FssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8" },
        { name: "Leo Vance", condition: "Observation", admission: "Feb 22, 16:20", status: "Pending", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg" }
      ];
      await Patient.insertMany(patients);
      console.log('[Supabase DB] Patients seeded');
    }

    const apptCount = await Appointment.countDocuments();
    if (apptCount === 0) {
      const appts = [
        { name: "Arthur Morgan", doctor: "Dr. Aisha Khan", dept: "Cardiology", time: "10:30 AM", date: "2024-02-24", status: "confirmed", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw" },
        { name: "Elena Fisher", doctor: "Dr. Sarah Jenkins", dept: "Gen Medicine", time: "11:15 AM", date: "2024-02-24", status: "confirmed", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik" },
        { name: "Joel Miller", doctor: "Dr. Jack Reed", dept: "Emergency", time: "12:00 PM", date: "2024-02-24", status: "completed", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0ssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8" },
        { name: "Leo Vance", doctor: "Dr. Helena Troy", dept: "Neurology", time: "02:30 PM", date: "2024-02-24", status: "pending", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg" }
      ];
      await Appointment.insertMany(appts);
      console.log('[Supabase DB] Appointments seeded');
    }

    const medicationCount = await Medication.countDocuments();
    if (medicationCount === 0) {
      const meds = [
        { name: "Amoxicillin", category: "Antibiotic", dosage: "500mg", sku: "SKU-88291", quantity: 120, status: "In Stock" },
        { name: "Atorvastatin", category: "Cardiovascular", dosage: "20mg", sku: "SKU-11204", quantity: 85, status: "In Stock" },
        { name: "Lisinopril", category: "Cardiovascular", dosage: "10mg", sku: "SKU-99210", quantity: 140, status: "In Stock" },
        { name: "Albuterol", category: "Respiratory", dosage: "90mcg", sku: "SKU-44012", quantity: 45, status: "In Stock" },
        { name: "Ibuprofen", category: "Analgesic", dosage: "400mg", sku: "SKU-55412", quantity: 200, status: "In Stock" }
      ];
      await Medication.insertMany(meds);
      console.log('[Supabase DB] Medications seeded');
    }

    const prescriptionCount = await Prescription.countDocuments();
    if (prescriptionCount === 0) {
      const prescriptions = [
        { patientName: "Arthur Morgan", drug: "Lisinopril (10mg)", dosage: "Once daily", date: "2024-02-24", status: "dispensed" },
        { patientName: "Elena Fisher", drug: "Amoxicillin (500mg)", dosage: "TID x 7 days", date: "2024-02-24", status: "dispensed" },
        { patientName: "Joel Miller", drug: "Ibuprofen (400mg)", dosage: "PRN pain", date: "2024-02-24", status: "dispensed" }
      ];
      await Prescription.insertMany(prescriptions);
      console.log('[Supabase DB] Prescriptions seeded');
    }

    const reportCount = await Report.countDocuments();
    if (reportCount === 0) {
      const reports = [
        { name: "Monthly Clinical Audit Report Q1", category: "Clinical", date: "2024-02-15", size: "4.2 MB", author: "Dr. Sarah Jenkins" },
        { name: "Patient Billing Collections Ledger", category: "Financial", date: "2024-02-22", size: "1.8 MB", author: "Dr. Jack Reed" },
        { name: "OR Suite Utilization Statistics", category: "Operational", date: "2024-02-23", size: "850 KB", author: "Dr. Aisha Khan" }
      ];
      await Report.insertMany(reports);
      console.log('[Supabase DB] Reports seeded');
    }

    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      const doctors = [
        { name: "Dr. Aisha Khan", dept: "Cardiology", status: "busy", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxE0Kc-a84miM3cx60p-is_bmHfiuDni2VYTT13G7qH4EHo7VInDBPQf4KvsZEdoY4BjpC5ilIM2izkMM9QWnv942pBrRN6W5DJSpzZWc1zarDgsffmVC1fjLswQ3Bc-exrEkeyXHSvEfAXOGgX1IUEjt_u_EqScu7e0V96-bf-KRzX4MBcMGdyC-zZ8A7lhCflEHR03TY2y6IIxnexbbIGi_iBRgeYSOjnTIqtkcnQ8u3c9X_FAEKptPJrNL3bAtuyqgIJWLEi-g", gender: "Female", age: 42, email: "aisha.khan@healthcopilot.com", schedule: "08:00 - 16:00" },
        { name: "Dr. Sarah Jenkins", dept: "Gen Medicine", status: "available", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o", gender: "Female", age: 48, email: "sarah.jenkins@healthcopilot.com", schedule: "09:00 - 17:00" },
        { name: "Dr. Helena Troy", dept: "Neurology", status: "consulting", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI", gender: "Female", age: 39, email: "helena.troy@healthcopilot.com", schedule: "24H" },
        { name: "Dr. Jack Reed", dept: "Emergency", status: "available", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU", gender: "Male", age: 45, email: "jack.reed@healthcopilot.com", schedule: "10:00 - 22:00" }
      ];
      await Doctor.insertMany(doctors);
      console.log('[Supabase DB] Doctors seeded');
    }

    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      const staffs = [
        { name: "Nurse Jack Reed", role: "Nurse", dept: "ER", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU", gender: "Male", age: 34, email: "jack.reed.staff@healthcopilot.com", shift: "Day Shift" },
        { name: "Mark Stevens", role: "Tech", dept: "ER", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc", gender: "Male", age: 29, email: "mark.stevens@healthcopilot.com", shift: "Night Shift" },
        { name: "Jane Doe", role: "Pharmacist", dept: "Pharmacy", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik", gender: "Female", age: 31, email: "jane.doe@healthcopilot.com", shift: "Day Shift" }
      ];
      await Staff.insertMany(staffs);
      console.log('[Supabase DB] Staff seeded');
    }

    const notifCount = await NotificationModel.countDocuments();
    if (notifCount === 0) {
      const initialNotifs = [
        { text: "ICU-02 Bed occupancy reached critical threshold", type: "urgent", time: "5m ago", read: false },
        { text: "Dr. Aisha Khan completed Coronary Bypass on Arthur Morgan", type: "success", time: "12m ago", read: false },
        { text: "New emergency admission request: Elena Fisher", type: "info", time: "30m ago", read: false },
        { text: "Pending collections ledger audit for invoice #INV-4200", type: "warning", time: "1h ago", read: false }
      ];
      await NotificationModel.insertMany(initialNotifs);
      console.log('[Supabase DB] Notifications seeded');
    }

    const pantryCount = await PantryOrder.countDocuments();
    if (pantryCount === 0) {
      const orders = [
        { patientName: "Arthur Morgan", room: "ICU-01", item: "Liquid Diet (Broth + Apple Juice)", quantity: 1, status: "Delivered", deliveryTime: "12:00 PM" },
        { patientName: "Elena Fisher", room: "ER-01", item: "Low-Sodium Diabetic Lunch", quantity: 1, status: "Preparing", deliveryTime: "ASAP" },
        { patientName: "Joel Miller", room: "ICU-02", item: "Regular Cardiac Diet Meal", quantity: 1, status: "Pending", deliveryTime: "01:30 PM" }
      ];
      await PantryOrder.insertMany(orders);
      console.log('[Supabase DB] Pantry seeded');
    }

    const diagnosisCount = await Diagnosis.countDocuments();
    if (diagnosisCount === 0) {
      const initialDiagnoses = [
        { patientName: "Arthur Morgan", age: 36, gender: "Male", doctorName: "Dr. Sarah Jenkins", testType: "MRI", testDate: "2026-06-18", results: "Scan of left shoulder joints reveals mild inflammation. Rotator cuff is fully intact.", status: "Completed" },
        { patientName: "Joel Miller", age: 48, gender: "Male", doctorName: "Dr. Aisha Khan", testType: "Pathology", testDate: "2026-06-19", results: "Blood panel shows slightly elevated cholesterol. White blood cell count within normal range.", status: "Completed" },
        { patientName: "Elena Fisher", age: 32, gender: "Female", doctorName: "Dr. David Carter", testType: "X-Ray", testDate: "2026-06-19", results: "Chest X-Ray displays clear lung fields. No signs of consolidation or pleural effusion.", status: "Completed" },
        { patientName: "Nathan Drake", age: 35, gender: "Male", doctorName: "Dr. Sarah Jenkins", testType: "USG", testDate: "2026-06-20", results: "Abdominal ultrasound confirms normal size and echotexture of liver, kidneys, and spleen.", status: "Completed" }
      ];
      await Diagnosis.insertMany(initialDiagnoses);
      console.log('[Supabase DB] Diagnosis seeded');
    }
  } catch (err) {
    console.error('[Supabase DB] Seeding error:', err);
  }
}

module.exports = {
  pool,
  dbInit,
  Patient: makeModelInterface('patients'),
  Appointment: makeModelInterface('appointments'),
  Transaction: makeModelInterface('transactions'),
  Bed: makeModelInterface('beds'),
  Surgery: makeModelInterface('surgeries'),
  Invoice: makeModelInterface('invoices'),
  Medication: makeModelInterface('medications'),
  Prescription: makeModelInterface('prescriptions'),
  Report: makeModelInterface('reports'),
  Doctor: makeModelInterface('doctors'),
  Staff: makeModelInterface('staff'),
  NotificationModel: makeModelInterface('notifications'),
  PantryOrder: makeModelInterface('pantry_orders'),
  Diagnosis: makeModelInterface('diagnoses')
};

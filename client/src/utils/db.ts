import { supabase } from './supabase';
import dynamicRoutes from './dynamic_routes.json';

// Helper: Map DB column names to JS keys
function mapColToKey(col: string): string {
  if (col === 'patient_name') return 'patientName';
  if (col === 'doctor_name') return 'doctorName';
  if (col === 'test_type') return 'testType';
  if (col === 'test_date') return 'testDate';
  if (col === 'delivery_time') return 'deliveryTime';
  if (col === 'insurance_claimed') return 'insuranceClaimed';
  if (col === 'claimed_amount') return 'claimedAmount';
  if (col === 'approved_amount') return 'approvedAmount';
  return col;
}

// Helper: Map JS keys back to DB column names
function mapKeyToCol(key: string): string {
  if (key === 'patientName') return 'patient_name';
  if (key === 'doctorName') return 'doctor_name';
  if (key === 'testType') return 'test_type';
  if (key === 'testDate') return 'test_date';
  if (key === 'deliveryTime') return 'delivery_time';
  if (key === 'insuranceClaimed') return 'insurance_claimed';
  if (key === 'claimedAmount') return 'claimed_amount';
  if (key === 'approvedAmount') return 'approved_amount';
  return key;
}

export function mapRow(row: any, _tableName?: string): any {
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
  invoices: ['patient_name', 'dept', 'services', 'amount', 'date', 'status', 'gender', 'age', 'insurance_claimed', 'claimed_amount', 'approved_amount'],
  medications: ['name', 'category', 'dosage', 'sku', 'quantity', 'status'],
  prescriptions: ['patient_name', 'drug', 'dosage', 'date', 'status'],
  reports: ['name', 'category', 'date', 'size', 'author'],
  doctors: ['name', 'dept', 'status', 'img', 'gender', 'age', 'email', 'schedule'],
  staff: ['name', 'role', 'dept', 'status', 'img', 'gender', 'age', 'email', 'shift'],
  notifications: ['text', 'type', 'time', 'read'],
  pantry_orders: ['patient_name', 'room', 'item', 'quantity', 'status', 'delivery_time'],
  diagnoses: ['patient_name', 'age', 'gender', 'doctor_name', 'test_type', 'test_date', 'results', 'status'],
  pantry_inventory: ['name', 'stock', 'unit'],
  dashboard_pages: ['name', 'href', 'icon', 'subtitle', 'status', 'order_index'],
  admin_profile: ['id', 'name', 'age', 'designation', 'email', 'img']
};

// Apply build-time dynamic routes fields schema metadata
for (const tableName of dynamicRoutes.dynamicTables) {
  tableFields[tableName] = ['name', 'status', 'details'];
}

class QueryBuilder {
  tableName: string;
  whereClause: Record<string, any>;
  orderByCol: string;
  orderByAsc: boolean;
  limitVal: number | null;

  constructor(tableName: string, whereClause = {}) {
    this.tableName = tableName;
    this.whereClause = whereClause;
    this.orderByCol = '';
    this.orderByAsc = true;
    this.limitVal = null;
  }

  sort(sortObj: Record<string, number>): this {
    const keys = Object.keys(sortObj);
    if (keys.length > 0) {
      const key = keys[0];
      this.orderByAsc = sortObj[key] !== -1;
      this.orderByCol = key === 'createdAt' ? 'created_at' : mapKeyToCol(key);
    }
    return this;
  }

  limit(val: number): this {
    this.limitVal = val;
    return this;
  }

  async execute(): Promise<any[]> {
    let query = supabase.from(this.tableName).select('*');

    for (const [key, val] of Object.entries(this.whereClause)) {
      const col = key === 'id' || key === '_id' ? 'id' : mapKeyToCol(key);
      query = query.eq(col, val);
    }

    if (this.orderByCol) {
      query = query.order(this.orderByCol, { ascending: this.orderByAsc });
    }

    if (this.limitVal !== null) {
      query = query.limit(this.limitVal);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => mapRow(row, this.tableName));
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
    const existingId = this.id || this._id;

    // Build a column-keyed data object
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (f === 'id') continue;
      const key = mapColToKey(f);
      if (this[key] !== undefined) {
        data[f] = this[key];
      }
    }

    if (existingId) {
      // Check if record already exists
      const { data: existing } = await supabase
        .from(this._tableName)
        .select('id')
        .eq('id', existingId)
        .maybeSingle();

      if (existing) {
        // UPDATE existing record
        let { data: updated, error } = await supabase
          .from(this._tableName)
          .update(data)
          .eq('id', existingId)
          .select()
          .single();
        
        if (error) {
          const isMissingColumn = error.message.includes('column') && (
            error.message.includes('insurance_claimed') ||
            error.message.includes('claimed_amount') ||
            error.message.includes('approved_amount')
          );
          if (isMissingColumn) {
            console.warn('[Supabase DB] Retrying update without new insurance columns due to stale schema cache:', error.message);
            const prunedData = { ...data };
            delete prunedData['insurance_claimed'];
            delete prunedData['claimed_amount'];
            delete prunedData['approved_amount'];

            const retryResult = await supabase
              .from(this._tableName)
              .update(prunedData)
              .eq('id', existingId)
              .select()
              .single();

            if (retryResult.error) {
              throw new Error(retryResult.error.message);
            }
            updated = retryResult.data;
            error = null;
          } else {
            throw new Error(error.message);
          }
        }
        Object.assign(this, mapRow(updated, this._tableName));
        return this;
      }
    }

    // INSERT new record (beds table uses custom text IDs)
    if (this._tableName === 'beds' && this.id) {
      data['id'] = this.id;
    }

    let { data: inserted, error } = await supabase
      .from(this._tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      const isMissingColumn = error.message.includes('column') && (
        error.message.includes('insurance_claimed') ||
        error.message.includes('claimed_amount') ||
        error.message.includes('approved_amount')
      );
      if (isMissingColumn) {
        console.warn('[Supabase DB] Retrying insert without new insurance columns due to stale schema cache:', error.message);
        const prunedData = { ...data };
        delete prunedData['insurance_claimed'];
        delete prunedData['claimed_amount'];
        delete prunedData['approved_amount'];

        const retryResult = await supabase
          .from(this._tableName)
          .insert(prunedData)
          .select()
          .single();

        if (retryResult.error) {
          throw new Error(retryResult.error.message);
        }
        inserted = retryResult.data;
        error = null;
      } else {
        throw new Error(error.message);
      }
    }
    Object.assign(this, mapRow(inserted, this._tableName));
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
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return new Model(tableName, mapRow(data, tableName));
  };

  modelInterface.findByIdAndDelete = async function(id: string) {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return mapRow(data, tableName);
  };

  modelInterface.findByIdAndUpdate = async function(id: string, update: Record<string, any>) {
    const cols: Record<string, any> = {};
    for (const [key, val] of Object.entries(update)) {
      cols[mapKeyToCol(key)] = val;
    }
    const { data, error } = await supabase
      .from(tableName)
      .update(cols)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return new Model(tableName, mapRow(data, tableName));
  };

  modelInterface.findOneAndUpdate = async function(query: Record<string, any>, update: Record<string, any>) {
    // Find matching record ID first
    let selectQuery = supabase.from(tableName).select('id').limit(1);
    for (const [key, val] of Object.entries(query)) {
      const col = key === 'id' || key === '_id' ? 'id' : mapKeyToCol(key);
      selectQuery = selectQuery.eq(col, val);
    }
    const { data: existing } = await selectQuery.maybeSingle();
    if (!existing) return null;

    const cols: Record<string, any> = {};
    for (const [key, val] of Object.entries(update)) {
      cols[mapKeyToCol(key)] = val;
    }
    const { data, error } = await supabase
      .from(tableName)
      .update(cols)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) return null;
    return new Model(tableName, mapRow(data, tableName));
  };

  modelInterface.countDocuments = async function(query: Record<string, any> = {}) {
    let countQuery = supabase.from(tableName).select('*', { count: 'exact', head: true });
    for (const [key, val] of Object.entries(query)) {
      const col = key === 'id' || key === '_id' ? 'id' : mapKeyToCol(key);
      countQuery = countQuery.eq(col, val);
    }
    const { count, error } = await countQuery;
    if (error) throw new Error(error.message);
    return count || 0;
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

// Lightweight init — tables are pre-created via schema.sql in Supabase SQL Editor
export async function dbInit() {
  console.log('[Supabase DB] Connected to', process.env.NEXT_PUBLIC_SUPABASE_URL);
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
export const AdminProfile = makeModelInterface('admin_profile');

// Export dynamically built models
const exportsMap: Record<string, any> = {};
for (const [modelName, tableName] of Object.entries(dynamicRoutes.dynamicModels)) {
  exportsMap[modelName] = makeModelInterface(tableName as string);
}

export const getDynamicModel = (modelName: string) => exportsMap[modelName];

// Expose supabase client for routes that need raw queries (vector search, bulk ops)
export { supabase };

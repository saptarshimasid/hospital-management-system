import { NextRequest, NextResponse } from 'next/server';
import {
  dbInit,
  Patient,
  Appointment,
  Transaction,
  Bed,
  Surgery,
  Invoice,
  Medication,
  Prescription,
  Report,
  Doctor,
  Staff,
  NotificationModel,
  PantryOrder,
  Diagnosis,
  AdminProfile,
  supabase,
  mapRow
} from '@/utils/db';

let dbInitializationPromise: Promise<void> | null = null;

async function ensureDb() {
  if (!dbInitializationPromise) {
    dbInitializationPromise = dbInit();
  }
  await dbInitializationPromise;
}

// Helper to extract JSON body safely
async function getJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// --- GEMINI REST API HELPERS ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured in server environment');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function getEmbedding(text: string): Promise<number[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured in server environment');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text }] }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Embedding error: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.embedding?.values || [];
}

// --- Vector DB Context Retrieval ---
async function getRelevantContext(query: string): Promise<string> {
  try {
    const vector = await getEmbedding(query);
    const vectorStr = `[${vector.join(',')}]`;

    // Execute cosine similarity query using Supabase RPC (pgvector)
    const { data, error } = await supabase.rpc('match_chat_vectors', {
      query_embedding: vectorStr,
      match_threshold: 0.35,
      match_count: 1
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return `\n=== RELEVANT HISTORICAL AI CONTEXT ===\nPrevious Query (Similarity: ${parseFloat(row.similarity).toFixed(2)}):\nUser: ${row.prompt}\nAI: ${row.response}\n=======================================\n`;
    }
  } catch (err: any) {
    console.error('[VectorDB] Retrieve error:', err.message);
  }
  return '';
}

// --- main Catch-all Handler ---
export async function GET(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  await ensureDb();
  const resolvedParams = await params;
  const route = resolvedParams.route;
  const path = route.join('/');
  
  try {
    if (path === 'metrics') {
      const patientsCount = await Patient.countDocuments();
      const activeBeds = await Bed.countDocuments({ status: 'occupied' });
      const cleaningBeds = await Bed.countDocuments({ status: 'cleaning' });
      const totalBeds = await Bed.countDocuments();
      const recentPatientsList = await Patient.find().sort({ createdAt: -1 }).limit(10);
      const txns = await Transaction.find();
      const allInvoices = await Invoice.find();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paidInvoices = allInvoices.filter((inv: any) => inv.status === 'Paid' || inv.status === 'Partial Paid');

      // Combine transactions and paid/partial-paid invoices as payment records
      const paymentRecords = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...txns.map((t: any) => ({
          amount: parseFloat(t.amount || 0),
          date: t.date
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...paidInvoices.map((inv: any) => {
          let amt = 0;
          if (inv.status === 'Paid') {
            amt = parseFloat(inv.amount || 0);
          } else if (inv.status === 'Partial Paid') {
            amt = inv.insuranceClaimed ? parseFloat(inv.approvedAmount || 0) : parseFloat(inv.amount || 0) * 0.5;
          }
          return {
            amount: amt,
            date: inv.date
          };
        })
      ];
      
      const doctorsCount = await Doctor.countDocuments();
      const staffCount = await Staff.countDocuments();

      // Calculate weekly revenue from actual payment records in last 7 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeklyRevenue = paymentRecords.filter((t: any) => {
        if (!t.date) return false;
        const txnDate = new Date(t.date);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return txnDate >= oneWeekAgo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).reduce((acc: number, curr: any) => acc + curr.amount, 0);

      // Calculate last 6 months revenue for chart
      const monthlyRevenue = [0, 0, 0, 0, 0, 0];
      const nowMonth = new Date().getMonth();
      const nowYear = new Date().getFullYear();

      // Calculate daily revenue for current month
      const daysInCurrentMonth = new Date(nowYear, nowMonth + 1, 0).getDate();
      const dailyRevenue = new Array(daysInCurrentMonth).fill(0);

      for (const t of paymentRecords) {
        if (!t.date) continue;
        const parts = t.date.split('-');
        if (parts.length === 3) {
          const tYear = parseInt(parts[0]);
          const tMonth = parseInt(parts[1]) - 1; // 0-indexed
          const tDay = parseInt(parts[2]);

          const monthDiff = (nowYear - tYear) * 12 + (nowMonth - tMonth);
          if (monthDiff >= 0 && monthDiff < 6) {
            monthlyRevenue[5 - monthDiff] += t.amount;
          }

          if (tMonth === nowMonth && tYear === nowYear) {
            if (tDay >= 1 && tDay <= daysInCurrentMonth) {
              dailyRevenue[tDay - 1] += t.amount;
            }
          }
        }
      }

      // Calculate departments case volume dynamically from appointments or doctors
      const totalAppts = await Appointment.countDocuments();
      let cardVal = 0, neuroVal = 0, pedsVal = 0, oncVal = 0, erVal = 0;
      if (totalAppts > 0) {
        cardVal = Math.round((await Appointment.countDocuments({ dept: 'Cardiology' }) / totalAppts) * 100);
        neuroVal = Math.round((await Appointment.countDocuments({ dept: 'Neurology' }) / totalAppts) * 100);
        pedsVal = Math.round((await Appointment.countDocuments({ dept: 'Pediatrics' }) / totalAppts) * 100);
        oncVal = Math.round((await Appointment.countDocuments({ dept: 'Oncology' }) / totalAppts) * 100);
        erVal = Math.round(((await Appointment.countDocuments({ dept: 'Emergency' }) + await Appointment.countDocuments({ dept: 'ER' })) / totalAppts) * 100);
      } else if (doctorsCount > 0) {
        // Fallback: use doctor distribution by department
        const allDoctors = await Doctor.find();
        const deptMap: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allDoctors.forEach((d: any) => { deptMap[d.dept || 'General'] = (deptMap[d.dept || 'General'] || 0) + 1; });
        const total = allDoctors.length;
        cardVal = Math.round(((deptMap['Cardiology'] || 0) / total) * 100);
        neuroVal = Math.round(((deptMap['Neurology'] || 0) / total) * 100);
        pedsVal = Math.round(((deptMap['Pediatrics'] || 0) / total) * 100);
        oncVal = Math.round(((deptMap['Oncology'] || 0) / total) * 100);
        erVal = Math.round((((deptMap['Emergency'] || 0) + (deptMap['ER'] || 0)) / total) * 100);
      }

      // Load active doctors and staff to build dynamic shifts array
      const activeDocs = await Doctor.find().limit(2);
      const activeStf = await Staff.find().limit(2);
      const dynamicShifts = [
        ...activeDocs.map((d: any) => ({
          name: d.name,
          role: `${d.dept} Physician`,
          time: d.schedule || '08:00 - 16:00',
          active: d.status === 'available',
          img: d.img || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI'
        })),
        ...activeStf.map((s: any) => ({
          name: s.name,
          role: s.role || 'Staff',
          time: s.shift || 'Day Shift',
          active: s.status === 'active',
          img: s.img || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU'
        }))
      ];

      return NextResponse.json({
        stats: {
          totalPatients: { value: patientsCount.toLocaleString(), change: null, type: null },
          totalDoctors: { value: doctorsCount.toString(), change: null, type: null },
          totalStaff: { value: staffCount.toString(), change: null, type: null },
          weeklyRevenue: { 
            value: weeklyRevenue >= 1000000 
              ? `$${(weeklyRevenue / 1000000).toFixed(2)}M` 
              : `$${weeklyRevenue.toLocaleString()}`, 
            change: null, 
            type: null 
          },
          bedAvailability: { 
            value: `${totalBeds - activeBeds - cleaningBeds} / ${totalBeds}`, 
            status: totalBeds > 0 && (activeBeds / totalBeds) > 0.9 ? 'Critical' : 'Stable', 
            occupancyRate: totalBeds > 0 ? `${((activeBeds / totalBeds) * 100).toFixed(1)}%` : '0%'
          }
        },
        departments: [
          { name: 'Cardiology', value: cardVal },
          { name: 'Neurology', value: neuroVal },
          { name: 'Pediatrics', value: pedsVal },
          { name: 'Oncology', value: oncVal },
          { name: 'ER', value: erVal }
        ],
        recentPatients: recentPatientsList.map((p: any) => ({
          id: p._id.toString().substring(18).toUpperCase(),
          name: p.name,
          condition: p.condition,
          admission: p.admission,
          status: p.status,
          img: p.img || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw',
          gender: p.gender,
          age: p.age,
          email: p.email
        })),
        shifts: dynamicShifts,
        monthlyRevenue: monthlyRevenue,
        dailyRevenue: dailyRevenue
      });
    }

    if (path === 'admin-profile') {
      const profiles = await AdminProfile.find({ id: 'admin' }).limit(1);
      let profile = profiles[0] || null;
      if (!profile) {
        profile = new AdminProfile({
          id: 'admin',
          name: 'Dr. Sarah Jenkins',
          age: 42,
          email: 'sarah.jenkins@hospital.com',
          designation: 'Chief Medical Officer',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o'
        });
        await profile.save();
      }
      return NextResponse.json(profile);
    }

    if (path === 'patients') {
      const list = await Patient.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'doctors') {
      const list = await Doctor.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'appointments') {
      const list = await Appointment.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'beds') {
      const list = await Bed.find();
      // Ensure beds sorted by ID alphabetically
      list.sort((a: any, b: any) => a.id.localeCompare(b.id));
      return NextResponse.json(list);
    }

    if (path === 'surgeries') {
      const list = await Surgery.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'invoices') {
      const list = await Invoice.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'transactions') {
      const list = await Transaction.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'medications') {
      const list = await Medication.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'prescriptions') {
      const list = await Prescription.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'reports') {
      const list = await Report.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'staff') {
      const list = await Staff.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'notifications') {
      const list = await NotificationModel.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'pantry') {
      const list = await PantryOrder.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'pantry/inventory') {
      const { data, error } = await supabase.from('pantry_inventory').select('*').order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json((data || []).map((row: any) => mapRow(row, 'pantry_inventory')));
    }

    if (path === 'diagnoses') {
      const list = await Diagnosis.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
    }

    if (path === 'pages') {
      const { data, error } = await supabase.from('dashboard_pages').select('*').order('order_index', { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json((data || []).map((row: any) => mapRow(row, 'dashboard_pages')));
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  await ensureDb();
  const resolvedParams = await params;
  const route = resolvedParams.route;
  const path = route.join('/');
  const body = await getJson(req);

  try {
    if (path === 'patients') {
      const patient = new Patient(body);
      await patient.save();

      const notif = new NotificationModel({
        text: `New patient admitted: ${patient.name} (${patient.condition})`,
        type: 'info',
        time: 'Just now',
        read: false
      });
      await notif.save();
      return NextResponse.json(patient, { status: 201 });
    }

    if (path === 'doctors') {
      const doctor = new Doctor(body);
      await doctor.save();

      const notif = new NotificationModel({
        text: `New physician registered: ${doctor.name} (${doctor.dept})`,
        type: 'success',
        time: 'Just now',
        read: false
      });
      await notif.save();
      return NextResponse.json(doctor, { status: 201 });
    }

    if (path === 'appointments') {
      const appointment = new Appointment(body);
      await appointment.save();

      const notif = new NotificationModel({
        text: `New appointment scheduled: ${appointment.name} with ${appointment.doctor}`,
        type: 'info',
        time: 'Just now',
        read: false
      });
      await notif.save();
      return NextResponse.json(appointment, { status: 201 });
    }

    if (path === 'surgeries') {
      const surgery = new Surgery(body);
      await surgery.save();

      const notif = new NotificationModel({
        text: `New surgery scheduled: ${surgery.procedure} for ${surgery.patientName}`,
        type: 'warning',
        time: 'Just now',
        read: false
      });
      await notif.save();
      return NextResponse.json(surgery, { status: 201 });
    }

    if (path === 'admin-profile') {
      try {
        const profiles = await AdminProfile.find({ id: 'admin' }).limit(1);
        let profile = profiles[0] || null;
        if (profile) {
          Object.assign(profile, body);
          await profile.save();
        } else {
          profile = new AdminProfile({ id: 'admin', ...body });
          await profile.save();
        }
        return NextResponse.json(profile);
      } catch (err: any) {
        console.error("POST /api/admin-profile Error:", err);
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    if (path === 'invoices') {
      try {
        const invoice = new Invoice(body);
        await invoice.save();
        return NextResponse.json(invoice, { status: 201 });
      } catch (err: any) {
        console.error("POST /api/invoices Error:", err);
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    if (path === 'transactions') {
      const transaction = new Transaction(body);
      await transaction.save();
      return NextResponse.json(transaction, { status: 201 });
    }

    if (path === 'medications') {
      const med = new Medication(body);
      await med.save();
      return NextResponse.json(med, { status: 201 });
    }

    if (path === 'reports') {
      const rep = new Report(body);
      await rep.save();
      return NextResponse.json(rep, { status: 201 });
    }

    if (path === 'staff') {
      const st = new Staff(body);
      await st.save();
      return NextResponse.json(st, { status: 201 });
    }

    if (path === 'pantry') {
      const po = new PantryOrder(body);
      await po.save();

      // Decrement stock of the item in pantry_inventory
      const item = body.item;
      const quantity = body.quantity || 1;
      // Fetch current stock then update
      const { data: invRow } = await supabase.from('pantry_inventory').select('stock').eq('name', item).maybeSingle();
      if (invRow) {
        const newStock = Math.max(0, (invRow.stock || 0) - quantity);
        await supabase.from('pantry_inventory').update({ stock: newStock }).eq('name', item);
      }

      return NextResponse.json(po, { status: 201 });
    }

    if (path === 'pantry/inventory') {
      const { name, stock, unit } = body;
      const { data: newItem, error } = await supabase
        .from('pantry_inventory')
        .insert({ name, stock, unit })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(mapRow(newItem, 'pantry_inventory'), { status: 201 });
    }

    if (path === 'diagnoses') {
      const diag = new Diagnosis(body);
      await diag.save();

      const notif = new NotificationModel({
        text: `Test results completed: ${diag.patientName} (${diag.testType})`,
        type: 'success',
        time: 'Just now',
        read: false
      });
      await notif.save();
      return NextResponse.json(diag, { status: 201 });
    }

    if (path === 'prescriptions') {
      const rx = new Prescription(body);
      await rx.save();
      return NextResponse.json(rx, { status: 201 });
    }

    if (path === 'beds') {
      const bed = new Bed(body);
      await bed.save();
      return NextResponse.json(bed, { status: 201 });
    }

    if (path === 'pages') {
      const { name, href, icon, subtitle, status, order_index } = body;
      const { data: newPage, error } = await supabase
        .from('dashboard_pages')
        .insert({ name, href, icon, subtitle, status, order_index: order_index || 0 })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(mapRow(newPage, 'dashboard_pages'), { status: 201 });
    }

    if (path === 'notifications/read-all') {
      await supabase.from('notifications').update({ read: true }).neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ success: true });
    }

    // POST /api/beds/:id/discharge
    if (path.startsWith('beds/') && path.endsWith('/discharge')) {
      const bedId = route[1];
      const bed = await Bed.findByIdAndUpdate(bedId, { status: 'available', patient: '', diagnosis: '', timer: 0 });
      return NextResponse.json(bed);
    }

    // POST /api/beds/:id/clean
    if (path.startsWith('beds/') && path.endsWith('/clean')) {
      const bedId = route[1];
      const { timer } = body;
      const bed = await Bed.findByIdAndUpdate(bedId, { status: 'cleaning', timer: timer || 5 });
      return NextResponse.json(bed);
    }

    // POST /api/beds/:id/reserve
    if (path.startsWith('beds/') && path.endsWith('/reserve')) {
      const bedId = route[1];
      const { patient, diagnosis, timer, gender, age } = body;
      const bed = await Bed.findByIdAndUpdate(bedId, {
        status: 'occupied',
        patient: patient || '',
        diagnosis: diagnosis || '',
        timer: timer || 0,
        gender: gender || '',
        age: age || null
      });
      return NextResponse.json(bed);
    }

    // POST /api/surgeries/:id/status
    if (path.startsWith('surgeries/') && path.endsWith('/status')) {
      const surgeryId = route[1];
      const { status } = body;
      const surgery = await Surgery.findByIdAndUpdate(surgeryId, { status });
      return NextResponse.json(surgery);
    }

    // POST /api/appointments/:id/status
    if (path.startsWith('appointments/') && path.endsWith('/status')) {
      const apptId = route[1];
      const { status } = body;
      const appt = await Appointment.findByIdAndUpdate(apptId, { status });
      return NextResponse.json(appt);
    }

    // POST /api/medications/:id/dispense
    if (path.startsWith('medications/') && path.endsWith('/dispense')) {
      const medId = route[1];
      const { quantity } = body;
      const med = await Medication.findById(medId);
      if (med) {
        const newQty = Math.max(0, med.quantity - (quantity || 1));
        const status = newQty === 0 ? 'Out of Stock' : 'In Stock';
        await Medication.findByIdAndUpdate(medId, { quantity: newQty, status });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // POST /api/prescriptions/:id/dispense
    if (path.startsWith('prescriptions/') && path.endsWith('/dispense')) {
      const rxId = route[1];
      const rx = await Prescription.findByIdAndUpdate(rxId, { status: 'dispensed' });
      return NextResponse.json(rx);
    }

    // --- AI CHAT COPILOT INTEGRATION ---
    if (path === 'chat') {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
      }

      try {
        // Step 1: Triage Node
        const triagePrompt = `You are an AI Triage assistant for a clinical command center.
Classify the following user message into one of three categories:
1. 'clinical' - General medical inquiries, symptom interpretation, patient vital alerts, medication questions.
2. 'diagnostic' - Requesting a step-by-step diagnostic plan, complex case analysis, or treatment scheduling guidelines.
3. 'general' - General greetings, administrative questions, dashboard guide, or standard chat.

User Message: ${prompt}

Respond with exactly one word: 'clinical', 'diagnostic', or 'general'.`;

        const triageCategory = (await callGemini('', triagePrompt)).trim().toLowerCase();
        const category = ['clinical', 'diagnostic', 'general'].includes(triageCategory) ? triageCategory : 'general';

        // Step 2: Context Retrieval from pgvector
        const historyContext = await getRelevantContext(prompt);

        // Step 3: Run Expert / Planner / Support Node
        let systemPrompt = '';
        if (category === 'clinical') {
          systemPrompt = `You are an expert Clinical Decision Support Agent.
Analyze the clinical question or patient vitals. Provide accurate, evidence-based guidance.
Keep your output clear, concise, and structured for quick reading under high-pressure clinical shifts.
Always prepend a brief high-priority alert status if vitals are out of bounds.
Crucial: End with a warning that the final decision rests with the attending medical professional.`;
        } else if (category === 'diagnostic') {
          systemPrompt = `You are an AI Diagnostic Pathways Architect.
Build a comprehensive, step-by-step diagnostic and treatment assessment pathway for the described case.
Incorporate triage steps, laboratory requests, imaging studies, and differential diagnosis considerations.
Structure the steps logically (Step 1, Step 2, Step 3) with clinical rationale for each step.`;
        } else {
          systemPrompt = `You are the Health Copilot Command assistant.
Help the user navigate the platform or answer general hospital admin/operation questions.
Be professional, friendly, and brief.`;
        }

        const promptContent = `${systemPrompt}\n\n${historyContext}User query: ${prompt}`;
        const rawResponse = await callGemini('', promptContent);

        // Step 4: Standardize / Formatting Node
        const formattingPrompt = `You are a Clinical UI Copywriter.
Take the following clinical response and format it beautifully with clean Markdown.
Ensure there are clear headers, bold keywords, and bullet points where appropriate.
Do not alter the medical core message or clinical warnings, but make it fit a modern dark-theme dashboard UI.
Wrap key warning messages in blockquotes or clean containers.

Category: ${category.toUpperCase()}
Raw Response:
${rawResponse}`;

        const formattedResponse = await callGemini('', formattingPrompt);

        // Step 5: Save Q&A vector directly to Supabase pgvector
        try {
          const vector = await getEmbedding(prompt);
          const vectorStr = `[${vector.join(',')}]`;
          await supabase.rpc('insert_chat_vector', {
            p_prompt: prompt,
            p_response: formattedResponse,
            p_category: category,
            p_embedding: vectorStr
          });
        } catch (e: any) {
          console.error('[VectorDB] Save error:', e.message);
        }

        return NextResponse.json({
          success: true,
          category,
          response: formattedResponse
        });
      } catch (err: any) {
        console.error('[Chat API] Gemini invocation error:', err.message);
        
        // Return standard rate-limit or error advisory to UI
        const isQuota = err.message.includes('RESOURCE_EXHAUSTED') || err.message.toLowerCase().includes('quota') || err.message.includes('429');
        let responseAdvisory = '';
        if (isQuota) {
          responseAdvisory = `### ⚠️ System Advisory: AI Rate Limit Encountered\n\nThe clinical command center AI Copilot is currently experiencing provider-side rate limits on the Free Tier API quota.\n\n> **Action Required:** Please wait 30–60 seconds and submit your query again.\n\n**Clinical Directive:** Attending staff must monitor patient status and vital telemetry directly via bedside monitors and the central EHR command board.`;
        } else {
          responseAdvisory = `### ⚠️ System Advisory: AI Copilot Offline\n\nAn unexpected internal error occurred: \`${err.message}\`\n\n> **Action Required:** Please retry in a few moments.\n\n**Clinical Directive:** Please verify patient chart data directly with the command console.`;
        }
        return NextResponse.json({
          success: true,
          category: 'general',
          response: responseAdvisory
        });
      }
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  await ensureDb();
  const resolvedParams = await params;
  const route = resolvedParams.route;
  const path = route.join('/');
  const body = await getJson(req);

  try {
    // PUT /api/beds/:id/discharge
    if (path.startsWith('beds/') && path.endsWith('/discharge')) {
      const bedId = route[1];
      const bed = await Bed.findByIdAndUpdate(bedId, { status: 'available', patient: '', diagnosis: '', timer: 0 });
      return NextResponse.json(bed);
    }

    // PUT /api/beds/:id/clean
    if (path.startsWith('beds/') && path.endsWith('/clean')) {
      const bedId = route[1];
      const { timer } = body;
      const bed = await Bed.findByIdAndUpdate(bedId, { status: 'cleaning', timer: timer || 5 });
      return NextResponse.json(bed);
    }

    // PUT /api/beds/:id/reserve
    if (path.startsWith('beds/') && path.endsWith('/reserve')) {
      const bedId = route[1];
      const { patient, diagnosis, timer, gender, age } = body;
      const bed = await Bed.findByIdAndUpdate(bedId, {
        status: 'occupied',
        patient: patient || '',
        diagnosis: diagnosis || '',
        timer: timer || 0,
        gender: gender || '',
        age: age || null
      });
      return NextResponse.json(bed);
    }

    // PUT /api/surgeries/:id/status
    if (path.startsWith('surgeries/') && path.endsWith('/status')) {
      const surgeryId = route[1];
      const { status } = body;
      const surgery = await Surgery.findByIdAndUpdate(surgeryId, { status });
      return NextResponse.json(surgery);
    }

    // PUT /api/appointments/:id/status
    if (path.startsWith('appointments/') && path.endsWith('/status')) {
      const apptId = route[1];
      const { status } = body;
      const appt = await Appointment.findByIdAndUpdate(apptId, { status });
      return NextResponse.json(appt);
    }

    // PUT /api/pantry/inventory/:id
    if (path.startsWith('pantry/inventory/')) {
      const inventoryId = route[2];
      const { stock, name, unit } = body;
      const { data: updatedItem, error } = await supabase
        .from('pantry_inventory')
        .update({ stock, name, unit })
        .eq('id', inventoryId)
        .select()
        .single();
      if (error || !updatedItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json(mapRow(updatedItem, 'pantry_inventory'));
    }

    // PUT /api/pages/:id
    if (path.startsWith('pages/')) {
      const pageId = route[1];
      const { name, href, icon, subtitle, status, order_index } = body;
      const { data: updatedPage, error } = await supabase
        .from('dashboard_pages')
        .update({ name, href, icon, subtitle, status, order_index: order_index || 0 })
        .eq('id', pageId)
        .select()
        .single();
      if (error || !updatedPage) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      return NextResponse.json(mapRow(updatedPage, 'dashboard_pages'));
    }

    // PUT /api/medications/:id/dispense
    if (path.startsWith('medications/') && path.endsWith('/dispense')) {
      const medId = route[1];
      const { quantity } = body;
      const med = await Medication.findById(medId);
      if (med) {
        const newQty = Math.max(0, med.quantity - (quantity || 1));
        const status = newQty === 0 ? 'Out of Stock' : 'In Stock';
        await Medication.findByIdAndUpdate(medId, { quantity: newQty, status });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // PUT /api/prescriptions/:id/dispense
    if (path.startsWith('prescriptions/') && path.endsWith('/dispense')) {
      const rxId = route[1];
      const rx = await Prescription.findByIdAndUpdate(rxId, { status: 'dispensed' });
      return NextResponse.json(rx);
    }

    // PUT /api/notifications/read-all
    if (path === 'notifications/read-all') {
      await supabase.from('notifications').update({ read: true }).neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ success: true });
    }

    // PUT /api/notifications/:id
    if (path.startsWith('notifications/') && route.length === 2) {
      const notifId = route[1];
      const { read } = body;
      const notif = await NotificationModel.findByIdAndUpdate(notifId, { read: !!read });
      return NextResponse.json(notif);
    }

    // PUT /api/pantry/:id
    if (path.startsWith('pantry/') && route.length === 2) {
      const orderId = route[1];
      const order = await PantryOrder.findByIdAndUpdate(orderId, body);
      return NextResponse.json(order);
    }

    // Generic PUT updates: PUT /api/:entity/:id
    if (route.length === 2) {
      const entity = route[0];
      const id = route[1];

      if (entity === 'patients') {
        const item = await Patient.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'doctors') {
        const item = await Doctor.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'staff') {
        const item = await Staff.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'appointments') {
        const item = await Appointment.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'beds') {
        const item = await Bed.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'surgeries') {
        const item = await Surgery.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'invoices') {
        const item = await Invoice.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'transactions') {
        const item = await Transaction.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'medications') {
        const item = await Medication.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'prescriptions') {
        const item = await Prescription.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'reports') {
        const item = await Report.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
      if (entity === 'diagnoses') {
        const item = await Diagnosis.findByIdAndUpdate(id, body);
        return NextResponse.json(item);
      }
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  await ensureDb();
  const resolvedParams = await params;
  const route = resolvedParams.route;
  const path = route.join('/');

  try {
    if (path === 'notifications/clear-all' || path === 'notifications') {
      await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('patients/') && route.length === 2) {
      const id = route[1];
      await Patient.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('doctors/') && route.length === 2) {
      const id = route[1];
      await Doctor.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('appointments/') && route.length === 2) {
      const id = route[1];
      await Appointment.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('surgeries/') && route.length === 2) {
      const id = route[1];
      await Surgery.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('transactions/') && route.length === 2) {
      const id = route[1];
      await Transaction.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('staff/') && route.length === 2) {
      const id = route[1];
      await Staff.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('pantry/') && route.length === 2) {
      const id = route[1];
      await PantryOrder.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('pantry/inventory/') && route.length === 3) {
      const id = route[2];
      const { data, error } = await supabase.from('pantry_inventory').delete().eq('id', id).select().single();
      if (error || !data) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json(mapRow(data, 'pantry_inventory'));
    }

    if (path.startsWith('pages/') && route.length === 2) {
      const id = route[1];
      const { data, error } = await supabase.from('dashboard_pages').delete().eq('id', id).select().single();
      if (error || !data) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      return NextResponse.json(mapRow(data, 'dashboard_pages'));
    }

    if (path.startsWith('diagnoses/') && route.length === 2) {
      const id = route[1];
      await Diagnosis.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('medications/') && route.length === 2) {
      const id = route[1];
      await Medication.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('prescriptions/') && route.length === 2) {
      const id = route[1];
      await Prescription.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('reports/') && route.length === 2) {
      const id = route[1];
      await Report.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('invoices/') && route.length === 2) {
      const id = route[1];
      await Invoice.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('beds/') && route.length === 2) {
      const id = route[1];
      await Bed.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

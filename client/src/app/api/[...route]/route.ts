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
  pool
} from '@/utils/db';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await dbInit();
    dbInitialized = true;
  }
}

// Helper to extract JSON body safely
async function getJson(req: NextRequest) {
  try {
    return await req.json();
  } catch (e) {
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

// --- VEctor DB Context Retrieval ---
async function getRelevantContext(query: string): Promise<string> {
  try {
    const vector = await getEmbedding(query);
    const vectorStr = `[${vector.join(',')}]`;
    
    // Execute cosine similarity query using pgvector
    const res = await pool.query(
      `SELECT prompt, response, category, 1 - (embedding <=> $1::vector) AS similarity 
       FROM chat_vectors 
       WHERE embedding IS NOT NULL AND (embedding <=> $1::vector) < 0.35 
       ORDER BY embedding <=> $1::vector 
       LIMIT 1`,
      [vectorStr]
    );

    if (res.rowCount && res.rowCount > 0) {
      const row = res.rows[0];
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
      const totalBeds = await Bed.countDocuments() || 250;
      const recentPatientsList = await Patient.find().sort({ createdAt: -1 }).limit(10);
      const txns = await Transaction.find();
      const totalRevenue = txns.reduce((acc: number, curr: any) => acc + parseFloat(curr.amount || 0), 0);
      const doctorsCount = await Doctor.countDocuments();
      const staffCount = await Staff.countDocuments();

      return NextResponse.json({
        stats: {
          totalPatients: { value: (12482 + patientsCount).toLocaleString(), change: '+12%', type: 'up' },
          totalDoctors: { value: (156 + doctorsCount).toString(), change: null, type: null },
          totalStaff: { value: (482 + staffCount).toString(), change: null, type: null },
          weeklyRevenue: { value: `$${((1200000 + totalRevenue) / 1000000).toFixed(1)}M`, change: '+8%', type: 'up' },
          bedAvailability: { 
            value: `${totalBeds - activeBeds - cleaningBeds} / ${totalBeds}`, 
            status: (activeBeds / totalBeds) > 0.9 ? 'Critical' : 'Stable', 
            occupancyRate: `${((activeBeds / totalBeds) * 100).toFixed(1)}%` 
          }
        },
        departments: [
          { name: 'Cardiology', value: 84 },
          { name: 'Neurology', value: 62 },
          { name: 'Pediatrics', value: 91 },
          { name: 'Oncology', value: 45 },
          { name: 'ER', value: 98 }
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
        shifts: [
          { name: 'Dr. Aisha Khan', role: 'Surgeon', time: '08:00 - 16:00', active: true, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxE0Kc-a84miM3cx60p-is_bmHfiuDni2VYTT13G7qH4EHo7VInDBPQf4KvsZEdoY4BjpC5ilIM2izkMM9QWnv942pBrRN6W5DJSpzZWc1zarDgsffmVC1fjLswQ3Bc-exrEkeyXHSvEfAXOGgX1IUEjt_u_EqScu7e0V96-bf-KRzX4MBcMGdyC-zZ8A7lhCflEHR03TY2y6IIxnexbbIGi_iBRgeYSOjnTIqtkcnQ8u3c9X_FAEKptPJrNL3bAtuyqgIJWLEi-g' },
          { name: 'Nurse Jack Reed', role: 'ER Duty', time: '10:00 - 22:00', active: true, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU' },
          { name: 'Dr. Helena Troy', role: 'On Call', time: '24H', active: true, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI' },
          { name: 'Mark Stevens', role: 'Tech', time: 'Tomorrow 06:00', active: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc' }
        ]
      });
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

    if (path === 'diagnoses') {
      const list = await Diagnosis.find().sort({ createdAt: -1 });
      return NextResponse.json(list);
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

    if (path === 'invoices') {
      const invoice = new Invoice(body);
      await invoice.save();
      return NextResponse.json(invoice, { status: 201 });
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
      return NextResponse.json(po, { status: 201 });
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

    if (path === 'notifications/read-all') {
      await pool.query('UPDATE notifications SET read = TRUE');
      return NextResponse.json({ success: true });
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
          await pool.query(
            `INSERT INTO chat_vectors (prompt, response, category, embedding) 
             VALUES ($1, $2, $3, $4::vector)`,
            [prompt, formattedResponse, category, vectorStr]
          );
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
      await pool.query('DELETE FROM notifications');
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

    if (path.startsWith('diagnoses/') && route.length === 2) {
      const id = route[1];
      await Diagnosis.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

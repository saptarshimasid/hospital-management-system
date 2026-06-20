const express = require('express');
const cors = require('cors');
const axios = require('axios');
const {
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
  Diagnosis
} = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Initialize database
dbInit();

// GET dashboard metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const patientsCount = await Patient.countDocuments();
    const activeBeds = await Bed.countDocuments({ status: 'occupied' });
    const cleaningBeds = await Bed.countDocuments({ status: 'cleaning' });
    const totalBeds = await Bed.countDocuments() || 250;
    
    const recentPatientsList = await Patient.find().sort({ createdAt: -1 }).limit(10);
    const txns = await Transaction.find();
    const totalRevenue = txns.reduce((acc, curr) => acc + curr.amount, 0);

    const doctorsCount = await Doctor.countDocuments();
    const staffCount = await Staff.countDocuments();

    res.json({
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
      recentPatients: recentPatientsList.map(p => ({
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patient CRUD
app.get('/api/patients', async (req, res) => {
  try {
    const list = await Patient.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();

    const notif = new NotificationModel({
      text: `New patient admitted: ${patient.name} (${patient.condition})`,
      type: 'info',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Doctor CRUD
app.get('/api/doctors', async (req, res) => {
  try {
    const list = await Doctor.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/doctors', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();

    const notif = new NotificationModel({
      text: `New physician registered: ${doctor.name} (${doctor.dept})`,
      type: 'success',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(doctor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Staff CRUD
app.get('/api/staff', async (req, res) => {
  try {
    const list = await Staff.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const staff = new Staff(req.body);
    await staff.save();

    const notif = new NotificationModel({
      text: `New staff member registered: ${staff.name} (${staff.role})`,
      type: 'success',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(staff);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Appointment CRUD
app.get('/api/appointments', async (req, res) => {
  try {
    const list = await Appointment.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const item = new Appointment(req.body);
    await item.save();

    const notif = new NotificationModel({
      text: `Appointment booked: ${item.name} for ${item.dept}`,
      type: 'info',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Transaction CRUD
app.get('/api/transactions', async (req, res) => {
  try {
    const list = await Transaction.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const item = new Transaction(req.body);
    await item.save();

    const notif = new NotificationModel({
      text: `Financial transaction logged: ${item.patientName} - $${item.amount}`,
      type: 'success',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bed CRUD
app.get('/api/beds', async (req, res) => {
  try {
    const list = await Bed.find().sort({ id: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/beds/:id/reserve', async (req, res) => {
  try {
    const { patient, diagnosis, gender, age } = req.body;
    const item = await Bed.findOneAndUpdate(
      { id: req.params.id },
      { status: 'occupied', patient, diagnosis, gender, age },
      { new: true }
    );
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/beds/:id/discharge', async (req, res) => {
  try {
    const item = await Bed.findOneAndUpdate(
      { id: req.params.id },
      { status: 'cleaning', patient: '', diagnosis: '', timer: 10 },
      { new: true }
    );
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/beds/:id/clean', async (req, res) => {
  try {
    const item = await Bed.findOneAndUpdate(
      { id: req.params.id },
      { status: 'available', timer: 0 },
      { new: true }
    );
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Surgery CRUD
app.get('/api/surgeries', async (req, res) => {
  try {
    const list = await Surgery.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/surgeries', async (req, res) => {
  try {
    const item = new Surgery(req.body);
    await item.save();

    const notif = new NotificationModel({
      text: `Surgery case scheduled: ${item.patientName} (${item.procedure})`,
      type: 'info',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/surgeries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Surgery.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/surgeries/:id', async (req, res) => {
  try {
    await Surgery.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Invoice CRUD
app.get('/api/invoices', async (req, res) => {
  try {
    const list = await Invoice.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const item = new Invoice(req.body);
    await item.save();

    const notif = new NotificationModel({
      text: `Patient invoice generated: ${item.patientName} - $${item.amount}`,
      type: 'warning',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Medication CRUD
app.get('/api/medications', async (req, res) => {
  try {
    const list = await Medication.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/medications', async (req, res) => {
  try {
    const item = new Medication(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/medications/:id/dispense', async (req, res) => {
  try {
    const { quantity } = req.body;
    const med = await Medication.findById(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    med.quantity = Math.max(0, med.quantity - quantity);
    if (med.quantity === 0) med.status = 'Out of Stock';
    else if (med.quantity < 50) med.status = 'Low Stock';
    else med.status = 'In Stock';
    await med.save();
    res.json(med);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Prescription CRUD
app.get('/api/prescriptions', async (req, res) => {
  try {
    const list = await Prescription.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const item = new Prescription(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/prescriptions/:id/dispense', async (req, res) => {
  try {
    const item = await Prescription.findByIdAndUpdate(req.params.id, { status: 'dispensed' }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Report CRUD
app.get('/api/reports', async (req, res) => {
  try {
    const list = await Report.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const item = new Report(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Notification routes
app.get('/api/notifications', async (req, res) => {
  try {
    const list = await NotificationModel.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const item = new NotificationModel(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    await NotificationModel.updateMany({}, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const { read } = req.body;
    const item = await NotificationModel.findByIdAndUpdate(req.params.id, { read }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await NotificationModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Pantry CRUD
app.get('/api/pantry', async (req, res) => {
  try {
    const list = await PantryOrder.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pantry', async (req, res) => {
  try {
    const item = new PantryOrder(req.body);
    await item.save();

    const notif = new NotificationModel({
      text: `New pantry order requested: Room ${item.room} - ${item.item}`,
      type: 'info',
      time: 'Just now',
      read: false
    });
    await notif.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/pantry/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const item = await PantryOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    // Auto-create notification on status update
    if (status === 'Delivered') {
      const notif = new NotificationModel({
        text: `Pantry order delivered to Room ${item.room}`,
        type: 'success',
        time: 'Just now',
        read: false
      });
      await notif.save();
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/pantry/:id', async (req, res) => {
  try {
    await PantryOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Diagnosis CRUD
app.get('/api/diagnoses', async (req, res) => {
  try {
    const list = await Diagnosis.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/diagnoses', async (req, res) => {
  try {
    const item = new Diagnosis(req.body);
    await item.save();

    // Auto-create notification
    const alert = new NotificationModel({
      text: `New diagnosis results uploaded for ${item.patientName}: ${item.testType}`,
      type: "info",
      time: "Just now",
      read: false
    });
    await alert.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/diagnoses/:id', async (req, res) => {
  try {
    const { status, results } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (results) updateData.results = results;

    const item = await Diagnosis.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!item) return res.status(404).json({ error: "Diagnosis record not found" });

    // Dynamic notification
    const alert = new NotificationModel({
      text: `Diagnosis test results updated for ${item.patientName}`,
      type: "success",
      time: "Just now",
      read: false
    });
    await alert.save();

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/diagnoses/:id', async (req, res) => {
  try {
    await Diagnosis.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Proxy route to Python FastAPI Copilot Chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    
    // Call Python FastAPI
    const response = await axios.post(`${PYTHON_API_URL}/api/chat`, {
      prompt,
      history
    });
    
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      console.error('FastAPI error response payload:', error.response.data);
    } else {
      console.error('Error forwarding chat to AI service:', error.message);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to communicate with AI LangGraph engine',
      error: error.response?.data?.detail || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express API Gateway running on port ${PORT}`);
});

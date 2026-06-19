const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/health_copilot')
  .then(() => {
    console.log('Connected to MongoDB');
    seedDatabase();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas & Models
const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  condition: { type: String, required: true },
  admission: { type: String, default: 'Just now' },
  status: { type: String, default: 'Pending' },
  img: String,
  gender: String,
  age: Number,
  email: String
}, { timestamps: true });

const AppointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  doctor: { type: String, required: true },
  dept: { type: String, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'confirmed' },
  img: String,
  gender: String,
  age: Number,
  email: String
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  date: { type: String, required: true },
  gender: String,
  age: Number,
  email: String
}, { timestamps: true });

const BedSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  ward: { type: String, required: true },
  status: { type: String, default: 'available' },
  patient: String,
  diagnosis: String,
  timer: Number,
  gender: String,
  age: Number
});

const SurgerySchema = new mongoose.Schema({
  room: { type: String, required: true },
  patientName: { type: String, required: true },
  surgeon: { type: String, required: true },
  procedure: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, default: 'scheduled' },
  img: String,
  gender: String,
  age: Number
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  dept: { type: String, required: true },
  services: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  gender: String,
  age: Number
}, { timestamps: true });

const MedicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  dosage: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: { type: String, default: 'In Stock' }
}, { timestamps: true });

const PrescriptionSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  drug: { type: String, required: true },
  dosage: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'dispensed' }
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  size: { type: String, required: true },
  author: { type: String, required: true }
}, { timestamps: true });

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dept: { type: String, required: true },
  status: { type: String, default: 'available' },
  img: String,
  gender: String,
  age: Number,
  email: String,
  schedule: { type: String, default: '08:00 - 16:00' }
}, { timestamps: true });

const StaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  dept: { type: String, required: true },
  status: { type: String, default: 'active' },
  img: String,
  gender: String,
  age: Number,
  email: String,
  shift: { type: String, default: 'Day Shift' }
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'info', 'success', 'warning', 'urgent'
  time: { type: String, default: 'Just now' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const PantrySchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  room: { type: String, required: true },
  item: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  status: { type: String, default: 'Pending' }, // 'Pending', 'Preparing', 'Delivered'
  deliveryTime: { type: String, default: 'ASAP' }
}, { timestamps: true });

const Patient = mongoose.model('Patient', PatientSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Bed = mongoose.model('Bed', BedSchema);
const Surgery = mongoose.model('Surgery', SurgerySchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Medication = mongoose.model('Medication', MedicationSchema);
const Prescription = mongoose.model('Prescription', PrescriptionSchema);
const Report = mongoose.model('Report', ReportSchema);
const Doctor = mongoose.model('Doctor', DoctorSchema);
const Staff = mongoose.model('Staff', StaffSchema);
const NotificationModel = mongoose.model('Notification', NotificationSchema);
const PantryOrder = mongoose.model('PantryOrder', PantrySchema);

// Database Seeder
async function seedDatabase() {
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
      console.log('Beds collection seeded');
    }

    const surgeryCount = await Surgery.countDocuments();
    if (surgeryCount === 0) {
      const surgeries = [
        { room: "OT Suite 1", patientName: "Arthur Morgan", surgeon: "Dr. Aisha Khan", procedure: "Coronary Bypass", time: "08:00 - 12:30", status: "in progress", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw" },
        { room: "OT Suite 3", patientName: "Elena Fisher", surgeon: "Dr. Sarah Jenkins", procedure: "Appendectomy", time: "10:00 - 11:30", status: "in progress", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik" },
        { room: "OT Suite 2", patientName: "Leo Vance", surgeon: "Dr. Helena Troy", procedure: "Craniotomy", time: "01:30 - 04:30", status: "scheduled", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg" }
      ];
      await Surgery.insertMany(surgeries);
      console.log('Surgeries collection seeded');
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
      console.log('Invoices collection seeded');
    }

    const transactionCount = await Transaction.countDocuments();
    if (transactionCount === 0) {
      const transactions = [
        { patientName: "Arthur Morgan", type: "Insurance", amount: 11160, method: "ACH Transfer", date: "2024-02-23" },
        { patientName: "Elena Fisher", type: "Copay", amount: 35, method: "Credit Card", date: "2024-02-24" },
        { patientName: "Joel Miller", type: "Direct", amount: 1200, method: "Direct Debit", date: "2024-02-18" }
      ];
      await Transaction.insertMany(transactions);
      console.log('Transactions collection seeded');
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
      console.log('Patients collection seeded');
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
      console.log('Appointments collection seeded');
    }

    const medCount = await Medication.countDocuments();
    if (medCount === 0) {
      const meds = [
        { name: "Amoxicillin", category: "Antibiotic", dosage: "500mg", sku: "SKU-88291", quantity: 120, status: "In Stock" },
        { name: "Atorvastatin", category: "Cardiovascular", dosage: "20mg", sku: "SKU-11204", quantity: 85, status: "In Stock" },
        { name: "Lisinopril", category: "Cardiovascular", dosage: "10mg", sku: "SKU-99210", quantity: 140, status: "In Stock" },
        { name: "Albuterol", category: "Respiratory", dosage: "90mcg", sku: "SKU-44012", quantity: 45, status: "In Stock" },
        { name: "Ibuprofen", category: "Analgesic", dosage: "400mg", sku: "SKU-55412", quantity: 200, status: "In Stock" }
      ];
      await Medication.insertMany(meds);
      console.log('Medications collection seeded');
    }

    const presCount = await Prescription.countDocuments();
    if (presCount === 0) {
      const prescriptions = [
        { patientName: "Arthur Morgan", drug: "Lisinopril (10mg)", dosage: "Once daily", date: "2024-02-24", status: "dispensed" },
        { patientName: "Elena Fisher", drug: "Amoxicillin (500mg)", dosage: "TID x 7 days", date: "2024-02-24", status: "dispensed" },
        { patientName: "Joel Miller", drug: "Ibuprofen (400mg)", dosage: "PRN pain", date: "2024-02-24", status: "dispensed" }
      ];
      await Prescription.insertMany(prescriptions);
      console.log('Prescriptions collection seeded');
    }

    const reportCount = await Report.countDocuments();
    if (reportCount === 0) {
      const reports = [
        { name: "Monthly Clinical Audit Report Q1", category: "Clinical", date: "2024-02-15", size: "4.2 MB", author: "Dr. Sarah Jenkins" },
        { name: "Patient Billing Collections Ledger", category: "Financial", date: "2024-02-22", size: "1.8 MB", author: "Dr. Jack Reed" },
        { name: "OR Suite Utilization Statistics", category: "Operational", date: "2024-02-23", size: "850 KB", author: "Dr. Aisha Khan" }
      ];
      await Report.insertMany(reports);
      console.log('Reports collection seeded');
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
      console.log('Doctors collection seeded');
    }

    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      const staffs = [
        { name: "Nurse Jack Reed", role: "Nurse", dept: "ER", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU", gender: "Male", age: 34, email: "jack.reed.staff@healthcopilot.com", shift: "Day Shift" },
        { name: "Mark Stevens", role: "Tech", dept: "ER", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc", gender: "Male", age: 29, email: "mark.stevens@healthcopilot.com", shift: "Night Shift" },
        { name: "Jane Doe", role: "Pharmacist", dept: "Pharmacy", status: "active", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik", gender: "Female", age: 31, email: "jane.doe@healthcopilot.com", shift: "Day Shift" }
      ];
      await Staff.insertMany(staffs);
      console.log('Staff collection seeded');
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
      console.log('Notifications collection seeded');
    }

    const pantryCount = await PantryOrder.countDocuments();
    if (pantryCount === 0) {
      const orders = [
        { patientName: "Arthur Morgan", room: "ICU-01", item: "Liquid Diet (Broth + Apple Juice)", quantity: 1, status: "Delivered", deliveryTime: "12:00 PM" },
        { patientName: "Elena Fisher", room: "ER-01", item: "Low-Sodium Diabetic Lunch", quantity: 1, status: "Preparing", deliveryTime: "ASAP" },
        { patientName: "Joel Miller", room: "ICU-02", item: "Regular Cardiac Diet Meal", quantity: 1, status: "Pending", deliveryTime: "01:30 PM" }
      ];
      await PantryOrder.insertMany(orders);
      console.log('Pantry collection seeded');
    }
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

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

// Using global fetch in Node 22

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, path, method = 'GET', body = null) {
  const url = `${BASE_URL}/api/${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const startTime = Date.now();
    const res = await fetch(url, options);
    const duration = Date.now() - startTime;
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (res.ok) {
      console.log(`✅ [${method}] ${path} - Status: ${res.status} (${duration}ms)`);
      return { success: true, status: res.status, data };
    } else {
      console.log(`❌ [${method}] ${path} - Status: ${res.status} (${duration}ms)`);
      console.log(`   Error Response:`, typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200));
      return { success: false, status: res.status, data };
    }
  } catch (err) {
    console.log(`💥 [${method}] ${path} - Failed to fetch: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runAllTests() {
  console.log('=== STARTING HMS API VERIFICATION TESTS ===\n');

  // 1. Check secure metrics endpoint
  console.log('--- Testing Metrics ---');
  await testEndpoint('Metrics Overview', 'metrics');

  // 2. Check Patients CRUD
  console.log('\n--- Testing Patients CRUD ---');
  const patientData = {
    name: 'Verification Patient',
    condition: 'Verification Check',
    admission: 'Just now',
    status: 'Pending',
    gender: 'Female',
    age: 29,
    email: 'verify@example.com'
  };
  const createPatient = await testEndpoint('Create Patient', 'patients', 'POST', patientData);
  let createdPatientId;
  if (createPatient.success && createPatient.data && createPatient.data.id) {
    createdPatientId = createPatient.data.id;
    console.log(`   Created Patient with ID: ${createdPatientId}`);
  }
  await testEndpoint('Get Patients List', 'patients');
  if (createdPatientId) {
    await testEndpoint('Delete Patient', `patients/${createdPatientId}`, 'DELETE');
  }

  // 3. Check Doctors CRUD
  console.log('\n--- Testing Doctors CRUD ---');
  const doctorData = {
    name: 'Dr. Verify',
    dept: 'Cardiology',
    status: 'available',
    gender: 'Male',
    age: 45,
    email: 'drverify@example.com'
  };
  const createDoctor = await testEndpoint('Create Doctor', 'doctors', 'POST', doctorData);
  let createdDoctorId;
  if (createDoctor.success && createDoctor.data && createDoctor.data.id) {
    createdDoctorId = createDoctor.data.id;
  }
  await testEndpoint('Get Doctors List', 'doctors');
  if (createdDoctorId) {
    await testEndpoint('Delete Doctor', `doctors/${createdDoctorId}`, 'DELETE');
  }

  // 4. Check Appointments CRUD
  console.log('\n--- Testing Appointments CRUD ---');
  const apptData = {
    name: 'Verify Appt Patient',
    doctor: 'Dr. Aisha Khan',
    dept: 'Surgeries',
    time: '10:00 AM',
    date: '2026-06-25',
    status: 'confirmed',
    gender: 'Female',
    age: 32,
    email: 'apptverify@example.com'
  };
  const createAppt = await testEndpoint('Create Appointment', 'appointments', 'POST', apptData);
  let createdApptId;
  if (createAppt.success && createAppt.data && createAppt.data.id) {
    createdApptId = createAppt.data.id;
  }
  await testEndpoint('Get Appointments List', 'appointments');
  if (createdApptId) {
    await testEndpoint('Update Appointment Status', `appointments/${createdApptId}/status`, 'PUT', { status: 'completed' });
    await testEndpoint('Delete Appointment', `appointments/${createdApptId}`, 'DELETE');
  }

  // 5. Check Beds
  console.log('\n--- Testing Beds & Operations ---');
  await testEndpoint('Get Beds List', 'beds');
  // Let's check a bed operation. We need an existing bed ID. Typically bed IDs are '101A', '101B', etc.
  // We'll update Bed '101A'
  await testEndpoint('Reserve Bed 101A', 'beds/101A/reserve', 'PUT', {
    patient: 'Verify Bed Patient',
    diagnosis: 'General Admission',
    timer: 2,
    gender: 'Male',
    age: 42
  });
  await testEndpoint('Clean Bed 101A', 'beds/101A/clean', 'PUT', { timer: 3 });
  await testEndpoint('Discharge Bed 101A', 'beds/101A/discharge', 'PUT');

  // 6. Check Surgeries CRUD
  console.log('\n--- Testing Surgeries CRUD ---');
  const surgeryData = {
    room: 'OR-3',
    patientName: 'Verify Surgery Patient',
    surgeon: 'Dr. Aisha Khan',
    procedure: 'Appendectomy',
    time: '14:00',
    status: 'scheduled',
    gender: 'Male',
    age: 27
  };
  const createSurgery = await testEndpoint('Create Surgery', 'surgeries', 'POST', surgeryData);
  let createdSurgeryId;
  if (createSurgery.success && createSurgery.data && createSurgery.data.id) {
    createdSurgeryId = createSurgery.data.id;
  }
  await testEndpoint('Get Surgeries List', 'surgeries');
  if (createdSurgeryId) {
    await testEndpoint('Update Surgery Status', `surgeries/${createdSurgeryId}/status`, 'PUT', { status: 'completed' });
    await testEndpoint('Delete Surgery', `surgeries/${createdSurgeryId}`, 'DELETE');
  }

  // 7. Check Invoices & Billing
  console.log('\n--- Testing Invoices & Billing ---');
  const invoiceData = {
    patientName: 'Verify Invoice Patient',
    dept: 'Pediatrics',
    services: 'Consultation, Lab Tests',
    amount: 350.00,
    date: '2026-06-20',
    status: 'Pending',
    gender: 'Female',
    age: 8
  };
  await testEndpoint('Create Invoice', 'invoices', 'POST', invoiceData);
  await testEndpoint('Get Invoices List', 'invoices');

  // 8. Check Transactions
  console.log('\n--- Testing Transactions ---');
  const txnData = {
    patientName: 'Verify Txn Patient',
    type: 'Income',
    amount: 150.00,
    method: 'Credit Card',
    date: '2026-06-20',
    gender: 'Male',
    age: 38,
    email: 'verifytxn@example.com'
  };
  const createTxn = await testEndpoint('Create Transaction', 'transactions', 'POST', txnData);
  let createdTxnId;
  if (createTxn.success && createTxn.data && createTxn.data.id) {
    createdTxnId = createTxn.data.id;
  }
  await testEndpoint('Get Transactions List', 'transactions');
  if (createdTxnId) {
    await testEndpoint('Delete Transaction', `transactions/${createdTxnId}`, 'DELETE');
  }

  // 9. Check Pharmacy
  console.log('\n--- Testing Pharmacy ---');
  const medData = {
    name: 'Verify Med',
    category: 'Analgesics',
    dosage: '500mg',
    sku: 'MED-VERIFY-123',
    quantity: 100,
    status: 'In Stock'
  };
  const createMed = await testEndpoint('Create Medication', 'medications', 'POST', medData);
  let createdMedId;
  if (createMed.success && createMed.data && createMed.data.id) {
    createdMedId = createMed.data.id;
  }
  await testEndpoint('Get Medications List', 'medications');
  await testEndpoint('Get Prescriptions List', 'prescriptions');
  if (createdMedId) {
    await testEndpoint('Dispense Medication', `medications/${createdMedId}/dispense`, 'PUT', { quantity: 5 });
  }

  // 10. Check Reports
  console.log('\n--- Testing Reports ---');
  const reportData = {
    name: 'Verify Diagnostic Report',
    category: 'Imaging',
    date: '2026-06-20',
    size: '4.2 MB',
    author: 'Dr. Aisha Khan'
  };
  await testEndpoint('Create Report', 'reports', 'POST', reportData);
  await testEndpoint('Get Reports List', 'reports');

  // 11. Check Staff CRUD
  console.log('\n--- Testing Staff CRUD ---');
  const staffData = {
    name: 'Verify Staff Member',
    role: 'Receptionist',
    dept: 'Administration',
    status: 'active',
    gender: 'Female',
    age: 26,
    email: 'verifystaff@example.com',
    shift: 'Night Shift'
  };
  const createStaff = await testEndpoint('Create Staff', 'staff', 'POST', staffData);
  let createdStaffId;
  if (createStaff.success && createStaff.data && createStaff.data.id) {
    createdStaffId = createStaff.data.id;
  }
  await testEndpoint('Get Staff List', 'staff');
  if (createdStaffId) {
    await testEndpoint('Delete Staff', `staff/${createdStaffId}`, 'DELETE');
  }

  // 12. Check Pantry CRUD
  console.log('\n--- Testing Pantry CRUD ---');
  const pantryData = {
    patientName: 'Verify Pantry Patient',
    room: 'Ward-B2',
    item: 'Gluten-free Diet',
    quantity: 1,
    status: 'Pending',
    deliveryTime: '18:00'
  };
  const createPantry = await testEndpoint('Create Pantry Order', 'pantry', 'POST', pantryData);
  let createdPantryId;
  if (createPantry.success && createPantry.data && createPantry.data.id) {
    createdPantryId = createPantry.data.id;
  }
  await testEndpoint('Get Pantry Orders', 'pantry');
  if (createdPantryId) {
    await testEndpoint('Update Pantry Order', `pantry/${createdPantryId}`, 'PUT', { status: 'Delivered' });
    await testEndpoint('Delete Pantry Order', `pantry/${createdPantryId}`, 'DELETE');
  }

  // 13. Check Diagnoses CRUD
  console.log('\n--- Testing Diagnoses CRUD ---');
  const diagnosisData = {
    patientName: 'Verify Diagnosis Patient',
    age: 44,
    gender: 'Male',
    doctorName: 'Dr. Verify',
    testType: 'ECG Analysis',
    testDate: '2026-06-20',
    results: 'Normal Sinus Rhythm',
    status: 'Completed'
  };
  const createDiag = await testEndpoint('Create Diagnosis', 'diagnoses', 'POST', diagnosisData);
  let createdDiagId;
  if (createDiag.success && createDiag.data && createDiag.data.id) {
    createdDiagId = createDiag.data.id;
  }
  await testEndpoint('Get Diagnoses List', 'diagnoses');
  if (createdDiagId) {
    await testEndpoint('Delete Diagnosis', `diagnoses/${createdDiagId}`, 'DELETE');
  }

  // 14. Check Notifications & Read-All
  console.log('\n--- Testing Notifications & Read-All Mismatch ---');
  await testEndpoint('Get Notifications', 'notifications');
  
  // Test PUT to notifications/read-all (triggers layout.tsx click bug)
  console.log('👉 Testing notifications/read-all via PUT (should fail/mismatch or succeed if we fix it):');
  await testEndpoint('Mark All Read via PUT', 'notifications/read-all', 'PUT');
  
  // Test POST to notifications/read-all (as defined in route.ts)
  console.log('👉 Testing notifications/read-all via POST:');
  await testEndpoint('Mark All Read via POST', 'notifications/read-all', 'POST');

  console.log('\n=== VERIFICATION TESTS COMPLETED ===');
}

runAllTests();

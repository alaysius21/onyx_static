
(function(){
  const data = window.ONYX_DATA || {};
  const qs = new URLSearchParams(location.search);

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function getStore(key, fallback){
    const raw = localStorage.getItem(key);
    if (!raw) return clone(fallback);
    try { return JSON.parse(raw); } catch(e){ return clone(fallback); }
  }
  function setStore(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function initStores(){
    if (!localStorage.getItem('onyx_services')) setStore('onyx_services', data.services || []);
    if (!localStorage.getItem('onyx_gallery')) setStore('onyx_gallery', data.gallery || []);
    if (!localStorage.getItem('onyx_users')) setStore('onyx_users', data.users || []);
    if (!localStorage.getItem('onyx_bookings')) setStore('onyx_bookings', data.bookings || []);
    if (!localStorage.getItem('onyx_forms')) setStore('onyx_forms', data.forms || []);
  }
  initStores();

  const formatMoney = n => `$${Number(n || 0).toFixed(2)}`;
  const getServices = () => getStore('onyx_services', data.services || []);
  const getGallery = () => getStore('onyx_gallery', data.gallery || []);
  const getUsers = () => getStore('onyx_users', data.users || []);
  const getBookings = () => getStore('onyx_bookings', data.bookings || []);
  const getForms = () => getStore('onyx_forms', data.forms || []);
  const getServiceBySlug = slug => getServices().find(s => s.slug === slug) || getServices()[0];
  const pdfMap = {
    'Client Registration Pack': 'assets/pdfs/client-pack.pdf',
    'Service Agreement': 'assets/pdfs/service-agreement.pdf',
    'Authority to Act': 'assets/pdfs/authority-to-act.pdf',
    'Vet Release Form': 'assets/pdfs/vet-release-form.pdf',
    'Liability Agreement': 'assets/pdfs/liability-agreement.pdf',
    'Cancellation Policy': 'assets/pdfs/cancellation-policy.pdf',
    'Media Agreement': 'assets/pdfs/media-agreement.pdf'
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindAdminSidebar();
    bindWizard();
    renderHome();
    renderServiceDetail();
    renderBooking();
    bindLogin();
    bindClientForms();
    renderAdmin();
  });

  function bindAdminSidebar(){
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminOverlay');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const closeSidebar = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); };
    openBtn?.addEventListener('click', () => { sidebar?.classList.add('open'); overlay?.classList.add('show'); });
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
  }

  function bindWizard(){
    const form = document.getElementById('clientFormsForm');
    if (!form) return;
    const steps = Array.from(form.querySelectorAll('.wizard-step'));
    const nextBtn = form.querySelector('[data-wizard-next]');
    const prevBtn = form.querySelector('[data-wizard-prev]');
    let currentStep = 0;
    function showStep(idx){
      steps.forEach((step, i) => step.classList.toggle('d-none', i !== idx));
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === steps.length - 1;
      document.querySelectorAll('.wizard-pill').forEach((pill, i) => {
        pill.classList.toggle('active', i === idx);
        pill.classList.toggle('done', i < idx);
      });
    }
    nextBtn?.addEventListener('click', () => { if(currentStep < steps.length - 1){ currentStep++; showStep(currentStep);} });
    prevBtn?.addEventListener('click', () => { if(currentStep > 0){ currentStep--; showStep(currentStep);} });
    showStep(currentStep);
  }

  function renderHome(){
    const servicesGrid = document.getElementById('servicesGrid');
    if (servicesGrid){
      servicesGrid.innerHTML = getServices().map(s => `
        <div class="col-md-6 col-xl-3 d-flex">
          <a class="service-card text-decoration-none text-dark w-100" href="service-detail.html?slug=${s.slug}">
            <div class="service-icon ${s.bg_class} mb-4">${s.emoji}</div>
            <h5 class="fw-black fw-bold mb-1">${s.name}</h5>
            <div class="text-secondary small mb-2">${s.detail}</div>
            ${s.note_text ? `<div class="small text-muted fst-italic mb-2">*${s.note_text}</div>` : ''}
            <div class="brand fs-1 fw-bold text-orange mb-3">$${Number(s.price).toFixed(0)}</div>
            <div class="small fw-bold text-secondary">View Details <i class="bi bi-arrow-right"></i></div>
          </a>
        </div>`).join('');
    }
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid){
      galleryGrid.innerHTML = getGallery().map(item => `
        <div class="col-md-6 col-xl-3"><div class="gallery-card p-3"><img class="gallery-img" src="${item.image_url}" alt="${item.title}"><div class="fw-bold mt-3">${item.title}</div></div></div>`).join('');
    }
    const paperworkGrid = document.getElementById('paperworkGrid');
    if (paperworkGrid){
      paperworkGrid.innerHTML = (data.paperwork || []).map(([title, desc, emoji]) => `<div class="col-sm-6 col-xl-4"><div class="paper-card p-4 h-100"><div class="fs-2 mb-3">${emoji}</div><h5 class="fw-bold">${title}</h5><p class="small-muted mb-0">${desc}</p></div></div>`).join('');
    }
    const areasWrap = document.getElementById('areasWrap');
    if (areasWrap){
      areasWrap.innerHTML = (data.areas || []).map(area => `<span class="chip-area">📍 ${area}</span>`).join('');
    }
  }

  function renderServiceDetail(){
    const mount = document.getElementById('serviceDetailMount');
    if (!mount) return;
    const s = getServiceBySlug(qs.get('slug'));
    document.title = `${s.name} | Onyx Paws`;
    mount.innerHTML = `
      <div class="row g-5 align-items-start">
        <div class="col-lg-7">
          <div class="mb-4">
            <div class="fs-1 mb-2">${s.emoji}</div>
            <h1 class="brand display-4 fw-bold mb-2">${s.name}</h1>
            <p class="text-secondary fs-5">${s.tagline || ''}</p>
          </div>
          <div class="service-card p-4 mb-4">
            <div class="d-flex flex-wrap gap-3 mb-3"><span class="badge text-bg-light px-3 py-2 rounded-pill fw-bold">⏱ ${s.duration}</span><span class="badge text-bg-warning px-3 py-2 rounded-pill fw-bold">💳 $${Number(s.price).toFixed(0)}</span></div>
            <p class="text-secondary mb-0">${s.description || ''}</p>
          </div>
          <div class="row g-4"><div class="col-md-6"><div class="service-card p-4 h-100"><h4 class="fw-bold mb-3">What's Included</h4><ul class="list-check">${(s.includes || []).map(item => `<li><i class="bi bi-check-lg"></i><span>${item}</span></li>`).join('')}</ul></div></div><div class="col-md-6"><div class="service-card p-4 h-100"><h4 class="fw-bold mb-3">Good For</h4><ul class="list-check">${(s.good_for || []).map(item => `<li><i class="bi bi-heart-fill"></i><span>${item}</span></li>`).join('')}</ul></div></div></div>
          ${s.note_text ? `<div class="alert alert-warning rounded-4 border-0 mt-4"><strong>Note:</strong> ${s.note_text}</div>` : ''}
          ${s.warning_text ? `<div class="alert alert-danger rounded-4 border-0"><strong>Warning:</strong> ${s.warning_text}</div>` : ''}
        </div>
        <div class="col-lg-5"><div class="service-card p-4 sticky-top" style="top:90px;"><div class="section-label mb-2">Book this service</div><h3 class="brand fw-bold mb-2">Ready to book ${s.name}?</h3><p class="text-secondary">Move into the booking flow and generate the same invoice-style preview.</p><a class="btn btn-orange w-100 mb-3" href="booking-flow.html?slug=${s.slug}">Book This Service</a><a class="btn btn-outline-orange w-100" href="client-forms.html">Complete Paperwork First</a></div></div>
      </div>`;
  }

  function openPdfModal(title, src, frameId='clientDocFrame', modalId='clientDocModal', titleId='clientDocModalTitle'){
    const modalEl = document.getElementById(modalId);
    const frame = document.getElementById(frameId);
    const titleEl = document.getElementById(titleId);
    if (!modalEl || !frame) return;
    if (titleEl) titleEl.textContent = title;
    frame.src = src;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    modalEl.addEventListener('hidden.bs.modal', () => { frame.src = 'about:blank'; }, {once:true});
  }

  function bookingMarkup(booking, s){
    return `
      <div class="mb-4"><div class="fs-1">🧾</div><h1 class="brand display-5 fw-bold">Invoice Generated!</h1><p class="text-secondary">Review the saved booking details below.</p></div>
      <div class="service-card overflow-hidden p-0" style="max-width: 800px; margin: 0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.08);">
        <div class="invoice-header px-4 py-4" style="border-bottom: 4px solid #fff;"><div class="row align-items-center g-3"><div class="col-md-7 d-flex align-items-center gap-3"><span class="logo-badge fs-3 flex-shrink-0">🐾</span><div><div class="brand fs-2 fw-bold mb-1">Onyx Paws</div><div class="text-white-50 small">Professional Pet Care Services</div><div class="text-white-50 small">Kangaroo Flat, Bendigo VIC</div></div></div><div class="col-md-5 text-md-end text-start mt-3 mt-md-0"><div class="fw-bold text-uppercase small text-white-50">Booking Invoice</div><div class="fs-5 fw-bold">${booking.invoice_number}</div><div class="small text-white-50">${booking.created_at || ''}</div></div></div></div>
        <div class="p-4 p-lg-5" style="background:#fff"><div class="row g-4 mb-4"><div class="col-md-6"><div class="section-label mb-2">Client Details</div><div class="fw-bold mb-1">${booking.client_name}</div><div class="text-secondary small mb-1">Email: ${booking.client_email}</div><div class="text-secondary small mb-1">Phone: ${booking.client_phone || ''}</div><div class="text-secondary small">Pet: ${booking.pet_name} (${booking.pet_type})</div></div><div class="col-md-6"><div class="section-label mb-2">Booking Details</div><div class="text-secondary small mb-1">Status: <span class="fw-bold text-success text-capitalize">${booking.status}</span></div><div class="text-secondary small mb-1">Booked On: ${booking.created_at || ''}</div><div class="text-secondary small mb-1">Visit Date: ${booking.preferred_date || 'Not specified'}</div><div class="text-secondary small">Visit Time: ${booking.preferred_time || 'Not specified'}</div></div></div>
        <div class="table-responsive mb-4"><table class="table align-middle border rounded-4 overflow-hidden mb-0" style="background:#f9fafb;"><thead class="table-light"><tr><th style="width:50%">ITEM</th><th style="width:25%">DETAILS</th><th class="text-end" style="width:25%">AMOUNT</th></tr></thead><tbody><tr><td>${booking.service_name}</td><td>${s.duration}</td><td class="text-end">${formatMoney(booking.base_price)}</td></tr>${Number(booking.extra_pets) > 0 ? `<tr><td>Extra pets</td><td>${booking.extra_pets}</td><td class="text-end">${formatMoney(Number(booking.extra_pets)*10)}</td></tr>` : ''}</tbody><tfoot><tr class="table-dark"><th colspan="2" class="text-end">TOTAL DUE</th><th class="text-end">${formatMoney(booking.total_amount)}</th></tr></tfoot></table></div>
        <div class="mb-3 p-3 bg-light rounded-4 border"><div class="fw-bold mb-1">Service Summary</div><div class="small">${s.description || ''}</div></div>
        ${booking.notes ? `<div class="mb-3 p-3 bg-warning-subtle rounded-4 border"><div class="fw-bold mb-1">Booking Notes</div><div class="small">${booking.notes}</div></div>` : ''}
        <div class="pdf-preview-toolbar"><button type="button" class="btn btn-orange invoice-open-pdf" data-pdf="assets/pdfs/booking-${booking.id}.pdf">Open PDF Preview</button><a class="btn btn-outline-orange" href="assets/pdfs/booking-${booking.id}.pdf" target="_blank">Browser PDF</a></div>
        <div class="d-flex flex-wrap gap-3 mt-4"><a class="btn btn-orange" href="home.html">Back to Home</a><a class="btn btn-outline-orange" href="client-forms.html">Complete Client Paperwork</a></div>
        </div>
      </div>`;
  }

  function renderBooking(){
    const mount = document.getElementById('bookingMount');
    if (!mount) return;
    const s = getServiceBySlug(qs.get('slug'));
    document.title = `Book ${s.name} | Onyx Paws`;
    const back = document.getElementById('bookingBackLink');
    if (back) back.href = `service-detail.html?slug=${s.slug}`;
    const latestId = qs.get('booking');
    const booking = latestId ? getBookings().find(b => String(b.id) === String(latestId)) : null;
    const steps = document.getElementById('bookingSteps');
    if (steps && booking) steps.innerHTML = `<span class="step-pill done">📋 Booking Form</span><span class="step-pill done">🧾 Invoice Preview</span><span class="step-pill active">✅ Confirmation</span>`;
    if (!booking){
      mount.innerHTML = `
      <div class="mb-4"><div class="fs-1">📋</div><h1 class="brand display-5 fw-bold">Book: ${s.emoji} ${s.name}</h1><p class="text-secondary">Fill in your details and generate the invoice preview instantly.</p></div>
      <div class="service-card p-4 p-lg-5">
        <div class="d-flex align-items-center gap-3 bg-orange-main text-white rounded-4 p-4 mb-4 shadow-soft"><div class="fs-1">${s.emoji}</div><div><div class="fw-bold fs-5">${s.name}</div><div class="text-white-50">${s.duration}</div></div><div class="ms-auto text-end"><div class="brand fs-1 fw-bold">$${Number(s.price).toFixed(0)}</div><div class="text-white-50 small">base price</div></div></div>
        <form id="bookingForm"><div class="row g-4"><div class="col-md-6"><label class="form-label">Full Name *</label><input class="form-control" name="client_name" required></div><div class="col-md-6"><label class="form-label">Email Address *</label><input class="form-control" type="email" name="client_email" required></div><div class="col-md-6"><label class="form-label">Phone Number</label><input class="form-control" name="client_phone"></div><div class="col-md-6"><label class="form-label">Pet's Name *</label><input class="form-control" name="pet_name" required></div><div class="col-md-6"><label class="form-label">Type of Pet</label><select class="form-select" name="pet_type"><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Guinea Pig</option><option>Bird</option><option>Reptile</option><option>Other</option></select></div><div class="col-md-6"><label class="form-label">Extra Pets beyond 1st</label><input id="extra_pets" class="form-control" type="number" min="0" max="10" name="extra_pets" value="0"><div class="small-muted mt-2">+$10 per extra pet</div></div><div class="col-md-6"><label class="form-label">Preferred Date</label><input class="form-control" type="date" name="preferred_date"></div><div class="col-md-6"><label class="form-label">Preferred Time</label><input class="form-control" type="time" name="preferred_time"></div><div class="col-12"><label class="form-label">Notes</label><textarea class="form-control" rows="4" name="notes"></textarea></div></div><div class="d-flex justify-content-between align-items-center bg-warning-subtle rounded-4 p-4 mt-4 mb-4"><span class="fw-bold">Total Amount</span><span id="total_amount_preview" class="brand fs-2 fw-bold text-orange"></span></div><div class="d-flex gap-2 flex-wrap"><button class="btn btn-orange flex-grow-1" type="submit">Generate Invoice</button><button class="btn btn-outline-orange invoice-sample-preview" type="button">Preview Sample PDF</button></div></form>
      </div>`;
      const totalPreview = document.getElementById('total_amount_preview');
      const extraInput = document.getElementById('extra_pets');
      const updateTotal = () => totalPreview.textContent = formatMoney(Number(s.price) + (Number(extraInput.value || 0) * 10));
      extraInput?.addEventListener('input', updateTotal);
      updateTotal();
      document.querySelector('.invoice-sample-preview')?.addEventListener('click', () => openPdfModal(`${s.name} — PDF Preview`, `assets/pdfs/booking-1.pdf`, 'invoicePreviewFrame', 'invoicePreviewModal', 'invoicePreviewModalTitle'));
      document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const bookings = getBookings();
        const id = bookings.length ? Math.max(...bookings.map(b => Number(b.id))) + 1 : 1;
        const base = Number(s.price);
        const extra = Number(fd.get('extra_pets') || 0);
        const rec = {
          id,
          invoice_number: `OP-20260324-${1000 + id}`,
          service_slug: s.slug,
          service_name: s.name,
          base_price: base,
          extra_pets: extra,
          total_amount: base + (extra * 10),
          client_name: fd.get('client_name'),
          client_email: fd.get('client_email'),
          client_phone: fd.get('client_phone'),
          pet_name: fd.get('pet_name'),
          pet_type: fd.get('pet_type'),
          preferred_date: fd.get('preferred_date'),
          preferred_time: fd.get('preferred_time'),
          notes: fd.get('notes'),
          status: 'confirmed',
          created_at: new Date().toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'})
        };
        bookings.unshift(rec); setStore('onyx_bookings', bookings);
        Swal.fire({icon:'success', title:'Invoice generated', text:'The static preview now includes the PDF modal and browser preview.'}).then(() => {
          location.href = `booking-flow.html?slug=${s.slug}&booking=${id}`;
        });
      });
    } else {
      mount.innerHTML = bookingMarkup(booking, s);
      document.querySelector('.invoice-open-pdf')?.addEventListener('click', (e) => {
        openPdfModal(`${booking.invoice_number} — PDF Preview`, e.currentTarget.dataset.pdf, 'invoicePreviewFrame', 'invoicePreviewModal', 'invoicePreviewModalTitle');
      });
    }
  }

  function bindLogin(){
    const form = document.getElementById('adminLoginForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get('email') === 'admin@onyxpaws.local' && fd.get('password') === 'admin123') {
        sessionStorage.setItem('onyx_admin', '1');
        Swal.fire({icon:'success', title:'Login successful', timer:1200, showConfirmButton:false}).then(() => location.href = 'admin-dashboard.html?tab=bookings');
      } else {
        Swal.fire({icon:'error', title:'Invalid login', text:'Use admin@onyxpaws.local / admin123'});
      }
    });
  }

  function bindClientForms(){
    const form = document.getElementById('clientFormsForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const forms = getForms();
      const id = forms.length ? Math.max(...forms.map(f => Number(f.id))) + 1 : 1;
      const record = {
        id,
        client_name: fd.get('client_name'), client_email: fd.get('client_email'), client_phone: fd.get('client_phone'), client_address: fd.get('client_address'),
        pets: [{ name: fd.get('pet_name_1'), type: fd.get('pet_type_1'), breed: fd.get('pet_breed_1'), age: fd.get('pet_age_1'), health: fd.get('pet_health_1'), feeding: fd.get('pet_feeding_1') }].filter(p => p.name),
        status: 'submitted',
        submitted: new Date().toLocaleDateString('en-AU', {day:'2-digit', month:'short', year:'numeric'}),
        documents: [
          { title: 'Service Agreement', emoji: '📄', content: fd.get('service_agreement_signature') || 'Signed' },
          { title: 'Authority to Act', emoji: '🔑', content: fd.get('authority_signature') || 'Signed' },
          { title: 'Vet Release Form', emoji: '🏥', content: fd.get('vet_clinic_name') || 'No vet details provided' },
          { title: 'Liability Agreement', emoji: '⚖️', content: fd.get('liability_signature') || 'Signed' },
          { title: 'Cancellation Policy', emoji: '📅', content: fd.get('cancellation_signature') || 'Signed' },
          { title: 'Media Agreement', emoji: '📸', content: fd.get('media_signature') || 'Signed' },
        ]
      };
      forms.unshift(record);
      setStore('onyx_forms', forms);
      location.href = 'client-forms-success.html';
    });
  }

  function ensureAdmin(){
    if (!document.getElementById('adminMount')) return true;
    if (sessionStorage.getItem('onyx_admin') === '1') return true;
    location.href = 'admin-login.html';
    return false;
  }

  function renderAdmin(){
    const mount = document.getElementById('adminMount');
    if (!mount || !ensureAdmin()) return;
    const tab = qs.get('tab') || 'bookings';
    document.querySelectorAll('[data-tab-link]').forEach(a => a.classList.toggle('active', a.dataset.tabLink === tab));
    document.getElementById('logoutLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      Swal.fire({title:'Log out?', text:'You will be signed out of the admin dashboard.', icon:'warning', showCancelButton:true, confirmButtonText:'Yes, log out'}).then(r => { if (r.isConfirmed){ sessionStorage.removeItem('onyx_admin'); location.href='admin-login.html'; }});
    });
    if (tab === 'bookings') renderBookings(mount);
    if (tab === 'clientforms') renderForms(mount);
    if (tab === 'services') renderServices(mount);
    if (tab === 'gallery') renderGalleryAdmin(mount);
    if (tab === 'users') renderUsers(mount);
  }

  function renderBookings(mount){
    mount.innerHTML = `<section><div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 class="admin-page-title">Bookings</h1><p class="admin-page-subtitle mb-0">Manage booking requests and invoice-ready records.</p></div><a href="admin-dashboard.html?tab=bookings" class="admin-refresh-link"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</a></div><div class="dashboard-card p-0 overflow-hidden"><div class="table-responsive"><table id="bookingsTable" class="table admin-table-exact mb-0"><thead><tr><th>Invoice</th><th>Client</th><th>Service</th><th>Pet</th><th>Date</th><th>Total</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${getBookings().map(b => `<tr><td class="fw-bold">${b.invoice_number}</td><td><div class="fw-bold text-dark">${b.client_name}</div><div class="small text-secondary">${b.client_email}</div></td><td>${b.service_name}</td><td>${b.pet_name}<div class="small text-secondary">${b.pet_type}</div></td><td>${b.preferred_date || '—'}<div class="small text-secondary">${b.preferred_time || ''}</div></td><td class="fw-bold">${formatMoney(b.total_amount)}</td><td><select class="form-select form-select-sm admin-status-select booking-status" data-id="${b.id}"><option ${b.status==='pending'?'selected':''}>pending</option><option ${b.status==='confirmed'?'selected':''}>confirmed</option><option ${b.status==='completed'?'selected':''}>completed</option><option ${b.status==='cancelled'?'selected':''}>cancelled</option></select></td><td class="text-end"><div class="d-inline-flex flex-wrap gap-2 justify-content-end"><button class="btn btn-sm btn-light rounded-pill px-3 booking-preview" data-id="${b.id}"><i class="bi bi-eye me-1"></i>Preview</button><a class="btn btn-sm btn-secondary rounded-pill px-3" target="_blank" href="assets/pdfs/booking-${Math.min(b.id,2)}.pdf"><i class="bi bi-filetype-pdf me-1"></i>Browser PDF</a><button class="btn btn-sm btn-outline-danger rounded-pill px-3 booking-delete" data-id="${b.id}"><i class="bi bi-trash me-1"></i>Delete</button></div></td></tr>`).join('')}</tbody></table></div></div></section>`;
    if (window.DataTable) new DataTable('#bookingsTable', { pageLength: 10, order: [], responsive: true, language: { search: '', searchPlaceholder: 'Search…', lengthMenu: '_MENU_', info: 'Showing _START_ to _END_ of _TOTAL_', infoEmpty: 'No records found', zeroRecords: 'No matching records found' } });
    mount.querySelectorAll('.booking-status').forEach(sel => sel.addEventListener('change', () => {
      const bookings = getBookings(); const row = bookings.find(b => String(b.id)===sel.dataset.id); if(row){ row.status = sel.value; setStore('onyx_bookings', bookings); }
      Swal.fire({toast:true, position:'top-end', icon:'success', title:'Booking status updated', timer:1800, showConfirmButton:false});
    }));
    mount.querySelectorAll('.booking-delete').forEach(btn => btn.addEventListener('click', () => {
      Swal.fire({title:'Delete booking?', text:'This booking record will be permanently removed.', icon:'warning', showCancelButton:true, confirmButtonText:'Yes, delete booking'}).then(r => {
        if (!r.isConfirmed) return; setStore('onyx_bookings', getBookings().filter(b => String(b.id)!==btn.dataset.id)); renderBookings(mount);
      });
    }));
    mount.querySelectorAll('.booking-preview').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      openPdfModal(`Booking PDF Preview`, `assets/pdfs/booking-${id <= 2 ? id : 1}.pdf`);
    }));
  }

  function renderForms(mount){
    const forms = getForms();
    const docTitles = ['Service Agreement','Authority to Act','Vet Release Form','Liability Agreement','Cancellation Policy','Media Agreement'];
    // Only main rows in <tbody>
    mount.innerHTML = `<section><div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 class="admin-page-title">Client Forms</h1><p class="admin-page-subtitle mb-0">View submitted client registration paperwork and each signed document exactly from the admin workspace.</p></div><a href="admin-dashboard.html?tab=clientforms" class="admin-refresh-link"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</a></div><div class="dashboard-card p-0 overflow-hidden"><div class="table-responsive"><table id="formsTable" class="table admin-table-exact mb-0"><thead><tr><th style="width:52px"></th><th>Client</th><th>Contact</th><th>Pets</th><th>Documents</th><th>Status</th><th>Submitted</th><th class="text-end">Actions</th></tr></thead><tbody>${forms.map((f, idx) => `<tr data-detail="${f.id}"><td><button class="icon-btn client-form-toggle" type="button" data-target="detail-${f.id}"><i class="bi bi-chevron-down"></i></button></td><td><div class="fw-bold text-dark">${f.client_name}</div><div class="small text-secondary">${f.client_address || '—'}</div></td><td><div>${f.client_email}</div><div class="small text-secondary">${f.client_phone || '—'}</div></td><td><div class="fw-bold text-dark">${(f.pets||[]).length || 0} pet${((f.pets||[]).length || 0) === 1 ? '' : 's'}</div><div class="small text-secondary">${f.pets && f.pets[0] ? `${f.pets[0].name} · ${f.pets[0].type}` : 'No pets listed'}</div></td><td><div class="d-flex flex-wrap gap-1">${docTitles.map(t => `<span class="status-pill status-completed" style="font-size:.7rem;padding:.28rem .55rem;">${t}</span>`).join('')}</div></td><td><span class="status-pill status-completed">Complete</span></td><td>${f.submitted || '—'}</td><td class="text-end"><div class="d-inline-flex gap-2 flex-wrap justify-content-end"><button type="button" class="btn btn-sm btn-light rounded-pill px-3 fw-bold form-pack-open" data-pdf="assets/pdfs/client-pack.pdf">View Pack</button><a class="btn btn-sm btn-secondary rounded-pill px-3" target="_blank" href="assets/pdfs/client-pack.pdf">Browser PDF</a></div></td></tr>`).join('')}</tbody></table></div></div>` +
    // Render detail rows outside the table, hidden by default
    forms.map(f => `<div id="detail-${f.id}" class="client-form-detail-row d-none"><div class="client-form-detail-wrap m-3 mt-0"><div class="row g-3 mb-3"><div class="col-lg-6"><div class="dashboard-card p-4 h-100"><p class="client-form-label">Contact</p><p class="mb-2"><strong>Email:</strong> ${f.client_email || '—'}</p><p class="mb-2"><strong>Phone:</strong> ${f.client_phone || '—'}</p><p class="mb-0"><strong>Address:</strong> ${f.client_address || '—'}</p></div></div><div class="col-lg-6"><div class="dashboard-card p-4 h-100"><p class="client-form-label">Pets (${(f.pets||[]).length || 0})</p>${(f.pets||[]).length ? f.pets.map(p => `<div class="pet-line-item">🐾 <strong>${p.name || 'Unnamed Pet'}</strong> — ${p.type || 'Pet'}${p.breed ? `, ${p.breed}` : ''}${p.age ? `, ${p.age}` : ''}</div>`).join('') : '<p class="text-muted mb-0">No pets listed.</p>'}</div></div></div><div class="dashboard-card p-4 mb-3"><p class="client-form-label mb-3">Documents</p><div class="vstack gap-2">${docTitles.map(title => `<div class="client-doc-item"><div class="d-flex align-items-center gap-3 flex-grow-1 min-w-0"><span class="client-doc-emoji">${title === 'Service Agreement' ? '📄' : title === 'Authority to Act' ? '🔑' : title === 'Vet Release Form' ? '🏥' : title === 'Liability Agreement' ? '⚖️' : title === 'Cancellation Policy' ? '📅' : '📸'}</span><div class="min-w-0"><div class="fw-bold text-dark">${title}</div><div class="small text-secondary text-truncate">Signed and stored in the preview pack</div></div></div><div class="d-flex align-items-center gap-2 flex-wrap justify-content-end"><span class="status-pill status-completed">Accepted</span><button type="button" class="btn btn-sm btn-light rounded-pill px-3 fw-bold form-doc-open" data-title="${title}" data-pdf="${pdfMap[title]}">View</button><a class="btn btn-sm btn-orange rounded-pill px-3 fw-bold" target="_blank" href="${pdfMap[title]}">Download</a></div></div>`).join('')}</div></div></div></div></div>`).join('') + `</section>`;
    if (window.DataTable) new DataTable('#formsTable', {
      pageLength: 10,
      order: [],
      responsive: true,
      language: { search: '', searchPlaceholder: 'Search…', lengthMenu: '_MENU_' }
    });
    mount.querySelectorAll('.client-form-toggle').forEach(btn => btn.addEventListener('click', () => {
      const row = document.getElementById(btn.dataset.target);
      if (row) {
        row.classList.toggle('d-none');
        btn.classList.toggle('is-open');
        // Scroll to detail row if opening
        if (!row.classList.contains('d-none')) {
          row.scrollIntoView({behavior:'smooth', block:'center'});
        }
      }
    }));
    mount.querySelectorAll('.form-pack-open').forEach(btn => btn.addEventListener('click', () => openPdfModal('Client Registration Pack', btn.dataset.pdf)));
    mount.querySelectorAll('.form-doc-open').forEach(btn => btn.addEventListener('click', () => openPdfModal(btn.dataset.title, btn.dataset.pdf)));
  }

  function renderServices(mount){
    const services = getServices();
    mount.innerHTML = `<section><div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 class="admin-page-title">Services</h1><p class="admin-page-subtitle mb-0">Manage service cards without changing the exact dashboard feel.</p></div><button class="btn btn-orange rounded-pill px-4 fw-bold" id="addServiceBtn"><i class="bi bi-plus-lg me-1"></i>Add Service</button></div><div class="dashboard-card p-4 mb-4 d-none" id="serviceFormWrap"><div class="d-flex align-items-center justify-content-between mb-3"><h3 class="fw-bold mb-0" id="serviceFormTitle">New Service</h3><button class="btn btn-link text-decoration-none fw-bold text-secondary" id="serviceCancelBtn">Cancel</button></div><form id="serviceForm" class="row g-3"><input type="hidden" name="service_id"><div class="col-md-6"><label class="form-label">Name</label><input class="form-control" name="name" required></div><div class="col-md-6"><label class="form-label">Slug</label><input class="form-control" name="slug"></div><div class="col-md-3"><label class="form-label">Emoji</label><input class="form-control" name="emoji" value="🐾"></div><div class="col-md-3"><label class="form-label">Price</label><input class="form-control" type="number" step="0.01" name="price"></div><div class="col-md-3"><label class="form-label">Duration</label><input class="form-control" name="duration"></div><div class="col-md-3"><label class="form-label">Short Detail</label><input class="form-control" name="detail"></div><div class="col-md-6"><label class="form-label">Tagline</label><input class="form-control" name="tagline"></div><div class="col-md-6"><label class="form-label">Description</label><input class="form-control" name="description"></div><div class="col-12"><button class="btn btn-orange" type="submit">Save Service</button></div></form></div><div class="row g-4">${services.map(s => `<div class="col-md-6 col-xl-4"><div class="dashboard-card p-4 h-100"><div class="d-flex align-items-start justify-content-between gap-3"><div class="d-flex align-items-center gap-3"><div class="service-icon ${s.bg_class}">${s.emoji}</div><div><div class="fw-bold">${s.name}</div><div class="small text-secondary">${s.detail || ''}</div></div></div><div class="fw-bold text-orange">${formatMoney(s.price)}</div></div><div class="small text-secondary mt-3">${s.tagline || ''}</div><div class="d-flex gap-2 mt-4"><button class="btn btn-sm btn-light rounded-pill px-3 service-edit" data-slug="${s.slug}">Edit</button><button class="btn btn-sm btn-outline-danger rounded-pill px-3 service-delete" data-slug="${s.slug}">Delete</button></div></div></div>`).join('')}</div></section>`;
    const wrap = document.getElementById('serviceFormWrap');
    const form = document.getElementById('serviceForm');
    document.getElementById('addServiceBtn')?.addEventListener('click', ()=>{ wrap.classList.remove('d-none'); form.reset(); form.service_id.value=''; document.getElementById('serviceFormTitle').textContent='New Service'; window.scrollTo({top:0,behavior:'smooth'}); });
    document.getElementById('serviceCancelBtn')?.addEventListener('click', ()=> wrap.classList.add('d-none'));
    mount.querySelectorAll('.service-edit').forEach(btn => btn.addEventListener('click', ()=>{
      const s = getServices().find(x => x.slug === btn.dataset.slug); if(!s) return;
      wrap.classList.remove('d-none'); document.getElementById('serviceFormTitle').textContent='Edit Service';
      ['service_id','name','slug','emoji','price','duration','detail','tagline','description'].forEach(k => { if(form[k]) form[k].value = k==='service_id'?s.slug:(s[k]||''); });
      window.scrollTo({top:0,behavior:'smooth'});
    }));
    mount.querySelectorAll('.service-delete').forEach(btn => btn.addEventListener('click', ()=>{
      Swal.fire({title:'Delete service?', icon:'warning', showCancelButton:true, confirmButtonText:'Yes, delete'}).then(r => {
        if(!r.isConfirmed) return;
        setStore('onyx_services', getServices().filter(s => s.slug !== btn.dataset.slug));
        renderServices(mount);
      });
    }));
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const services = getServices();
      const slug = fd.get('service_id') || fd.get('slug') || `service-${Date.now()}`;
      const existing = services.find(s => s.slug === slug);
      const obj = existing || { bg_class: 'bg-orange-soft', includes: [], good_for: [] };
      Object.assign(obj, { slug: fd.get('slug') || slug, name: fd.get('name'), emoji: fd.get('emoji'), price: Number(fd.get('price')||0), duration: fd.get('duration'), detail: fd.get('detail'), tagline: fd.get('tagline'), description: fd.get('description') });
      if(!existing) services.unshift(obj);
      setStore('onyx_services', services);
      Swal.fire({icon:'success', title:'Service saved', timer:1200, showConfirmButton:false});
      renderServices(mount);
    });
  }

  function renderGalleryAdmin(mount){
    const items = getGallery();
    mount.innerHTML = `<section><div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 class="admin-page-title">Gallery</h1><p class="admin-page-subtitle mb-0">Manage gallery images in the exact card feel.</p></div><button class="btn btn-orange rounded-pill px-4 fw-bold" id="addGalleryBtn"><i class="bi bi-plus-lg me-1"></i>Add Image</button></div><div class="dashboard-card p-4 mb-4 d-none" id="galleryFormWrap"><div class="d-flex align-items-center justify-content-between mb-3"><h3 class="fw-bold mb-0">Gallery Item</h3><button class="btn btn-link text-decoration-none fw-bold text-secondary" id="galleryCancelBtn">Cancel</button></div><form id="galleryForm" class="row g-3"><input type="hidden" name="idx"><div class="col-md-6"><label class="form-label">Title</label><input class="form-control" name="title" required></div><div class="col-md-6"><label class="form-label">Image URL</label><input class="form-control" name="image_url" required></div><div class="col-12"><button class="btn btn-orange" type="submit">Save Image</button></div></form></div><div class="row g-4">${items.map((g,i) => `<div class="col-md-6 col-xl-4"><div class="dashboard-card p-3 h-100"><img src="${g.image_url}" class="gallery-img" alt="${g.title}"><div class="fw-bold mt-3">${g.title}</div><div class="d-flex gap-2 mt-3"><button class="btn btn-sm btn-light rounded-pill px-3 gallery-edit" data-idx="${i}">Edit</button><button class="btn btn-sm btn-outline-danger rounded-pill px-3 gallery-delete" data-idx="${i}">Delete</button></div></div></div>`).join('')}</div></section>`;
    const wrap = document.getElementById('galleryFormWrap');
    const form = document.getElementById('galleryForm');
    document.getElementById('addGalleryBtn')?.addEventListener('click', ()=>{ wrap.classList.remove('d-none'); form.reset(); });
    document.getElementById('galleryCancelBtn')?.addEventListener('click', ()=> wrap.classList.add('d-none'));
    mount.querySelectorAll('.gallery-edit').forEach(btn => btn.addEventListener('click', ()=>{ const g = getGallery()[Number(btn.dataset.idx)]; wrap.classList.remove('d-none'); form.idx.value = btn.dataset.idx; form.title.value = g.title; form.image_url.value = g.image_url; }));
    mount.querySelectorAll('.gallery-delete').forEach(btn => btn.addEventListener('click', ()=>{ Swal.fire({title:'Delete gallery item?', icon:'warning', showCancelButton:true}).then(r => { if(!r.isConfirmed) return; const arr=getGallery(); arr.splice(Number(btn.dataset.idx),1); setStore('onyx_gallery', arr); renderGalleryAdmin(mount); }); }));
    form?.addEventListener('submit', (e)=>{ e.preventDefault(); const fd=new FormData(form); const arr=getGallery(); const obj={title:fd.get('title'),image_url:fd.get('image_url')}; if(fd.get('idx')!==''){ arr[Number(fd.get('idx'))]=obj; } else { arr.unshift(obj); } setStore('onyx_gallery', arr); Swal.fire({icon:'success', title:'Gallery saved', timer:1200, showConfirmButton:false}); renderGalleryAdmin(mount); });
  }

  function renderUsers(mount){
    const users = getUsers();
    mount.innerHTML = `<section><div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 class="admin-page-title">Users</h1><p class="admin-page-subtitle mb-0">Manage admin and staff accounts.</p></div><button class="btn btn-orange rounded-pill px-4 fw-bold" id="addUserBtn"><i class="bi bi-plus-lg me-1"></i>Add User</button></div><div class="dashboard-card p-4 mb-4 d-none" id="userFormWrap"><div class="d-flex align-items-center justify-content-between mb-3"><h3 class="fw-bold mb-0">User</h3><button class="btn btn-link text-decoration-none fw-bold text-secondary" id="userCancelBtn">Cancel</button></div><form id="userForm" class="row g-3"><input type="hidden" name="idx"><div class="col-md-6"><label class="form-label">Full Name</label><input class="form-control" name="full_name" required></div><div class="col-md-6"><label class="form-label">Email</label><input class="form-control" name="email" required></div><div class="col-md-6"><label class="form-label">Role</label><select class="form-select" name="role"><option>admin</option><option>staff</option></select></div><div class="col-12"><button class="btn btn-orange" type="submit">Save User</button></div></form></div><div class="dashboard-card p-0 overflow-hidden"><div class="table-responsive"><table id="usersTable" class="table admin-table-exact mb-0"><thead><tr><th>User</th><th>Email</th><th>Role</th><th class="text-end">Actions</th></tr></thead><tbody>${users.map((u,i) => `<tr><td><div class="d-flex align-items-center gap-3"><div class="admin-avatar-mini ${u.role==='admin'?'admin-role':''}">${u.initial || u.full_name?.[0] || 'U'}</div><div class="fw-bold text-dark">${u.full_name}</div></div></td><td>${u.email}</td><td><span class="status-pill ${u.role==='admin'?'status-confirmed':'status-pending'}">${u.role}</span></td><td class="text-end"><div class="d-inline-flex gap-2"><button class="btn btn-sm btn-light rounded-pill px-3 user-edit" data-idx="${i}">Edit</button><button class="btn btn-sm btn-outline-danger rounded-pill px-3 user-delete" data-idx="${i}">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div></section>`;
    if (window.DataTable) new DataTable('#usersTable', { pageLength: 10, order: [] });
    const wrap = document.getElementById('userFormWrap');
    const form = document.getElementById('userForm');
    document.getElementById('addUserBtn')?.addEventListener('click', ()=>{ wrap.classList.remove('d-none'); form.reset(); });
    document.getElementById('userCancelBtn')?.addEventListener('click', ()=> wrap.classList.add('d-none'));
    mount.querySelectorAll('.user-edit').forEach(btn => btn.addEventListener('click', ()=>{ const u = getUsers()[Number(btn.dataset.idx)]; wrap.classList.remove('d-none'); form.idx.value = btn.dataset.idx; form.full_name.value = u.full_name; form.email.value = u.email; form.role.value = u.role; }));
    mount.querySelectorAll('.user-delete').forEach(btn => btn.addEventListener('click', ()=>{ Swal.fire({title:'Delete user?', icon:'warning', showCancelButton:true}).then(r => { if(!r.isConfirmed) return; const arr=getUsers(); arr.splice(Number(btn.dataset.idx),1); setStore('onyx_users', arr); renderUsers(mount); }); }));
    form?.addEventListener('submit', (e)=>{ e.preventDefault(); const fd = new FormData(form); const arr=getUsers(); const obj={full_name:fd.get('full_name'), email:fd.get('email'), role:fd.get('role'), initial:(fd.get('full_name')||'U').charAt(0).toUpperCase()}; if(fd.get('idx')!==''){ arr[Number(fd.get('idx'))]=obj; } else { arr.unshift(obj); } setStore('onyx_users', arr); Swal.fire({icon:'success', title:'User saved', timer:1200, showConfirmButton:false}); renderUsers(mount); });
  }

})();


"use strict";

/* =========================================
   KEUANGAN SAYA - SCRIPT.JS
   Versi perbaikan
========================================= */

const DATA_KEY = "keuanganSaya_v5";
const PIN_KEY = "keuanganSaya_pin_v2";
const THEME_KEY = "keuanganSaya_theme_v2";

const $ = id => document.getElementById(id);

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function defaultData() {
  return {
    accounts: [
      { id: "cash", name: "Tunai", balance: 0 },
      { id: "bank", name: "Bank", balance: 0 },
      { id: "ewallet", name: "E-Wallet", balance: 0 }
    ],
    transactions: [],
    savings: [],
    debts: [],
    budget: 0
  };
}

let data = loadData();
let balanceHidden = false;
let calcExpression = "";
let toastTimer = null;

/* =========================================
   PENYIMPANAN DATA
========================================= */

function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);

    if (!raw) return defaultData();

    const parsed = JSON.parse(raw);
    const fallback = defaultData();

    return {
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts : fallback.accounts,

      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions : [],

      savings: Array.isArray(parsed.savings)
        ? parsed.savings : [],

      debts: Array.isArray(parsed.debts)
        ? parsed.debts : [],

      budget: Number(parsed.budget) || 0
    };
  } catch (error) {
    console.error("Gagal membaca data:", error);
    return defaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showToast("Penyimpanan gagal. Periksa ruang penyimpanan.");
    return false;
  }
}

/* =========================================
   UTILITAS
========================================= */

function money(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date + "T00:00:00");

  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function currentMonth() {
  return today().slice(0, 7);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function confirmAction(message) {
  return window.confirm(message);
}

function getAccount(id) {
  return data.accounts.find(account => account.id === id);
}

function accountName(id) {
  const account = getAccount(id);
  return account ? account.name : "Akun tidak ditemukan";
}

function sumTransactions(type, month = null) {
  return data.transactions
    .filter(t => t.type === type)
    .filter(t => !month || t.date.startsWith(month))
    .reduce((total, t) => total + Number(t.amount || 0), 0);
}

function totalBalance() {
  return data.accounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0
  );
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* =========================================
   NAVIGASI
========================================= */

function openView(viewName) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle(
      "active",
      view.id === "view-" + viewName
    );
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === viewName
    );
  });

  if (viewName === "reports") renderReports();
  if (viewName === "budget") renderBudget();
  if (viewName === "settings") renderAccounts();
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    openView(button.dataset.view);
  });
});

document.querySelectorAll("[data-view-link]").forEach(button => {
  button.addEventListener("click", () => {
    openView(button.dataset.viewLink);
  });
});

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;

    if (target === "transaction") {
      openView("transactions");

      const text = button.textContent.toLowerCase();

      let type = "transfer";

      if (text.includes("pemasukan")) type = "income";
      if (text.includes("pengeluaran")) type = "expense";

      openTransactionForm(type);
    }

    if (target === "calculator") {
      openView("calculator");
    }
  });
});

/* =========================================
   DASHBOARD
========================================= */

function renderDashboard() {
  const balance = totalBalance();
  const income = sumTransactions("income");
  const expense = sumTransactions("expense");
  const month = currentMonth();

  $("totalBalance").textContent =
    balanceHidden ? "••••••••" : money(balance);

  $("totalIncome").textContent =
    balanceHidden ? "••••••" : money(income);

  $("totalExpense").textContent =
    balanceHidden ? "••••••" : money(expense);

  $("monthIncome").textContent =
    money(sumTransactions("income", month));

  $("monthExpense").textContent =
    money(sumTransactions("expense", month));

  $("monthLabel").textContent = new Date().toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric"
    }
  );

  $("todayText").textContent = new Date().toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

  $("accountSummary").innerHTML = data.accounts.length
    ? data.accounts.map(account => `
      <div class="item-row">
        <div class="item-main">
          <strong>${escapeHTML(account.name)}</strong>
          <small>Saldo akun</small>
        </div>
        <div class="item-amount">
          ${balanceHidden ? "••••••" : money(account.balance)}
        </div>
      </div>
    `).join("")
    : `<p class="muted">Belum ada akun.</p>`;

  const latest = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  $("recentTransactions").innerHTML = latest.length
    ? latest.map(transactionHTML).join("")
    : `<p class="muted">Belum ada transaksi.</p>`;

  $("dashboardDebt").textContent = money(
    data.debts
      .filter(d => d.type === "debt")
      .reduce((s, d) => s + Number(d.remaining), 0)
  );

  $("dashboardReceivable").textContent = money(
    data.debts
      .filter(d => d.type === "receivable")
      .reduce((s, d) => s + Number(d.remaining), 0)
  );
}

$("toggleBalance").addEventListener("click", () => {
  balanceHidden = !balanceHidden;

  $("toggleBalance").textContent =
    balanceHidden ? "◎" : "◉";

  renderDashboard();
});

/* =========================================
   AKUN
========================================= */

function populateAccountSelects() {
  const options = data.accounts.map(account => `
    <option value="${escapeHTML(account.id)}">
      ${escapeHTML(account.name)}
    </option>
  `).join("");

  [
    "transactionAccount",
    "transferFrom",
    "transferTo"
  ].forEach(id => {
    const select = $(id);
    if (select) select.innerHTML = options;
  });
}

function renderAccounts() {
  $("accountList").innerHTML = data.accounts.length
    ? data.accounts.map(account => `
      <div class="item-row">
        <div class="item-main">
          <strong>${escapeHTML(account.name)}</strong>
          <small>${money(account.balance)}</small>
        </div>

        <div class="item-actions">
          <button data-edit-account="${account.id}">
            Ubah nama
          </button>

          <button
            class="delete-button"
            data-delete-account="${account.id}">
            Hapus
          </button>
        </div>
      </div>
    `).join("")
    : `<p class="muted">Belum ada akun.</p>`;

  populateAccountSelects();
}

$("accountForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("accountName").value.trim();

  if (!name) return;

  data.accounts.push({
    id: makeId(),
    name,
    balance: 0
  });

  saveData();

  $("accountName").value = "";

  renderAll();
  showToast("Akun berhasil ditambahkan.");
});

$("accountList").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-account]");
  const deleteButton = event.target.closest("[data-delete-account]");

  if (editButton) {
    const account = getAccount(editButton.dataset.editAccount);

    if (!account) return;

    const newName = prompt(
      "Masukkan nama akun baru:",
      account.name
    );

    if (newName && newName.trim()) {
      account.name = newName.trim();

      saveData();
      renderAll();

      showToast("Nama akun diperbarui.");
    }
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteAccount;
    const account = getAccount(id);

    if (!account) return;

    if (data.accounts.length <= 1) {
      showToast("Minimal harus ada satu akun.");
      return;
    }

    const used = data.transactions.some(t =>
      t.accountId === id ||
      t.fromId === id ||
      t.toId === id
    );

    if (used) {
      showToast("Akun masih memiliki riwayat transaksi.");
      return;
    }

    if (!confirmAction(`Hapus akun "${account.name}"?`)) {
      return;
    }

    data.accounts = data.accounts.filter(a => a.id !== id);

    saveData();
    renderAll();

    showToast("Akun dihapus.");
  }
});

/* =========================================
   TRANSAKSI
========================================= */

function openTransactionForm(type = "expense", transaction = null) {
  $("transactionForm").classList.add("open");

  $("transactionFormTitle").textContent =
    transaction ? "Edit Transaksi" : "Tambah Transaksi";

  $("transactionId").value = transaction?.id || "";

  $("transactionType").value =
    transaction?.type || type;

  $("transactionAmount").value =
    transaction?.amount || "";

  $("transactionNote").value =
    transaction?.note || "";

  $("transactionDate").value =
    transaction?.date || today();

  $("transactionCategory").value =
    transaction?.category || "Lainnya";

  if (transaction?.accountId) {
    $("transactionAccount").value = transaction.accountId;
  }

  if (transaction?.fromId) {
    $("transferFrom").value = transaction.fromId;
  }

  if (transaction?.toId) {
    $("transferTo").value = transaction.toId;
  }

  updateTransactionFields();

  $("transactionForm").scrollIntoView({
    behavior: "smooth"
  });
}

function closeTransactionForm() {
  $("transactionForm").classList.remove("open");
  $("transactionForm").reset();
  $("transactionId").value = "";
}

function updateTransactionFields() {
  const isTransfer =
    $("transactionType").value === "transfer";

  $("singleAccountFields").classList.toggle(
    "hidden",
    isTransfer
  );

  $("transferFields").classList.toggle(
    "hidden",
    !isTransfer
  );
}

$("newTransactionButton").addEventListener("click", () => {
  openTransactionForm();
});

$("cancelTransaction").addEventListener("click", () => {
  closeTransactionForm();
});

$("transactionType").addEventListener("change", () => {
  updateTransactionFields();
});

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("transactionId").value;
  const type = $("transactionType").value;
  const amount = Number($("transactionAmount").value);
  const date = $("transactionDate").value;
  const note = $("transactionNote").value.trim();
  const category = $("transactionCategory").value;

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !date
  ) {
    showToast("Masukkan nominal dan tanggal yang benar.");
    return;
  }

  const oldTransaction = id
    ? data.transactions.find(t => t.id === id)
    : null;

  if (id && !oldTransaction) {
    showToast("Transaksi tidak ditemukan.");
    return;
  }

  const transaction = {
    id: id || makeId(),
    type,
    amount,
    date,
    note,
    category
  };

  if (type === "transfer") {
    const fromId = $("transferFrom").value;
    const toId = $("transferTo").value;

    if (
      !getAccount(fromId) ||
      !getAccount(toId) ||
      fromId === toId
    ) {
      showToast("Pilih dua akun yang berbeda dan valid.");
      return;
    }

    transaction.fromId = fromId;
    transaction.toId = toId;

  } else {
    const accountId = $("transactionAccount").value;

    if (!getAccount(accountId)) {
      showToast("Pilih akun yang valid.");
      return;
    }

    transaction.accountId = accountId;
  }

  /*
    Batalkan dampak transaksi lama.
    Setelah itu terapkan transaksi baru.
  */

  if (oldTransaction) {
    applyTransactionEffect(oldTransaction, -1);
  }

  applyTransactionEffect(transaction, 1);

  if (oldTransaction) {
    data.transactions = data.transactions.map(t =>
      t.id === id ? transaction : t
    );
  } else {
    data.transactions.push(transaction);
  }

  saveData();
  closeTransactionForm();
  renderAll();

  showToast(
    oldTransaction
      ? "Transaksi berhasil diperbarui."
      : "Transaksi berhasil disimpan."
  );
}

/*
  direction:
  1  = menerapkan transaksi
  -1 = membatalkan transaksi
*/

function applyTransactionEffect(transaction, direction) {
  const amount = Number(transaction.amount) * direction;

  if (transaction.type === "income") {
    const account = getAccount(transaction.accountId);

    if (account) {
      account.balance += amount;
    }
  }

  if (transaction.type === "expense") {
    const account = getAccount(transaction.accountId);

    if (account) {
      account.balance -= amount;
    }
  }

  if (transaction.type === "transfer") {
    const from = getAccount(transaction.fromId);
    const to = getAccount(transaction.toId);

    if (from) {
      from.balance -= amount;
    }

    if (to) {
      to.balance += amount;
    }
  }
}

function transactionHTML(t) {
  const typeLabel = {
    income: "Pemasukan",
    expense: "Pengeluaran",
    transfer: "Transfer"
  }[t.type] || "Transaksi";

  const sign =
    t.type === "income" ? "+" :
    t.type === "expense" ? "−" : "";

  const amountClass =
    t.type === "income" ? "amount-income" :
    t.type === "expense" ? "amount-expense" : "";

  const accountText = t.type === "transfer"
    ? `${escapeHTML(accountName(t.fromId))} → ${escapeHTML(accountName(t.toId))}`
    : escapeHTML(accountName(t.accountId));

  return `
    <div class="item-row">
      <div class="item-main">
        <strong>${escapeHTML(t.note || typeLabel)}</strong>

        <small>
          ${typeLabel} · ${escapeHTML(t.category || "-")}
        </small>

        <small>
          ${formatDate(t.date)} · ${accountText}
        </small>

        <div class="item-actions">
          <button data-edit-transaction="${t.id}">
            Edit
          </button>

          <button
            class="delete-button"
            data-delete-transaction="${t.id}">
            Hapus
          </button>
        </div>
      </div>

      <div class="item-amount ${amountClass}">
        ${sign}${money(t.amount)}
      </div>
    </div>
  `;
}

function renderTransactions() {
  const search = $("transactionSearch").value
    .toLowerCase()
    .trim();

  const filter = $("transactionFilter").value;

  const list = [...data.transactions]
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => {
      const text =
        `${t.note} ${t.category} ${t.type}`.toLowerCase();

      return text.includes(search);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  $("transactionList").innerHTML = list.length
    ? list.map(transactionHTML).join("")
    : `<p class="muted">Tidak ada transaksi yang ditemukan.</p>`;
}

$("transactionSearch").addEventListener("input", () => {
  renderTransactions();
});

$("transactionFilter").addEventListener("change", () => {
  renderTransactions();
});

$("transactionList").addEventListener("click", handleTransactionAction);
$("recentTransactions").addEventListener("click", handleTransactionAction);

function handleTransactionAction(event) {
  const edit = event.target.closest("[data-edit-transaction]");
  const remove = event.target.closest("[data-delete-transaction]");

  if (edit) {
    const transaction = data.transactions.find(t =>
      t.id === edit.dataset.editTransaction
    );

    if (transaction) {
      openView("transactions");
      openTransactionForm(transaction.type, transaction);
    }
  }

  if (remove) {
    const id = remove.dataset.deleteTransaction;

    const transaction = data.transactions.find(t =>
      t.id === id
    );

    if (!transaction) return;

    if (!confirmAction(
      "Hapus transaksi ini? Saldo akun akan disesuaikan."
    )) {
      return;
    }

    applyTransactionEffect(transaction, -1);

    data.transactions = data.transactions.filter(t =>
      t.id !== id
    );

    saveData();
    renderAll();

    showToast("Transaksi berhasil dihapus.");
  }
}

/* =========================================
   TABUNGAN
========================================= */

$("newSavingButton").addEventListener("click", () => {
  $("savingForm").classList.add("open");

  $("savingForm").scrollIntoView({
    behavior: "smooth"
  });
});

$("cancelSaving").addEventListener("click", () => {
  $("savingForm").classList.remove("open");
  $("savingForm").reset();
});

$("savingForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("savingName").value.trim();
  const target = Number($("savingTarget").value);
  const initial = Number($("savingInitial").value) || 0;

  if (
    !name ||
    !Number.isFinite(target) ||
    target <= 0 ||
    initial < 0 ||
    initial > target
  ) {
    showToast("Periksa nama dan nominal tabungan.");
    return;
  }

  data.savings.push({
    id: makeId(),
    name,
    target,
    current: initial,
    deadline: $("savingDeadline").value
  });

  saveData();

  $("savingForm").reset();
  $("savingForm").classList.remove("open");

  renderAll();

  showToast("Target tabungan ditambahkan.");
});

function renderSavings() {
  $("savingList").innerHTML = data.savings.length
    ? data.savings.map(saving => {
      const percent = Math.min(
        100,
        Math.round(
          (saving.current / saving.target) * 100
        )
      );

      return `
        <article class="panel">
          <div class="section-heading">
            <strong>${escapeHTML(saving.name)}</strong>
            <strong>${percent}%</strong>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width:${percent}%">
            </div>
          </div>

          <p>
            ${money(saving.current)}
            dari
            ${money(saving.target)}
          </p>

          <small class="muted">
            Target:
            ${saving.deadline
              ? formatDate(saving.deadline)
              : "Belum ditentukan"}
          </small>

          <div class="item-actions">
            <button data-saving-add="${saving.id}">
              Tambah uang
            </button>

            <button data-saving-take="${saving.id}">
              Ambil uang
            </button>

            <button data-saving-edit="${saving.id}">
              Ubah
            </button>

            <button
              class="delete-button"
              data-saving-delete="${saving.id}">
              Hapus
            </button>
          </div>
        </article>
      `;
    }).join("")
    : `<p class="muted">Belum ada target tabungan.</p>`;
}

$("savingList").addEventListener("click", event => {
  const add = event.target.closest("[data-saving-add]");
  const take = event.target.closest("[data-saving-take]");
  const edit = event.target.closest("[data-saving-edit]");
  const remove = event.target.closest("[data-saving-delete]");

  const button = add || take || edit || remove;

  if (!button) return;

  const id =
    button.dataset.savingAdd ||
    button.dataset.savingTake ||
    button.dataset.savingEdit ||
    button.dataset.savingDelete;

  const saving = data.savings.find(s => s.id === id);

  if (!saving) return;

  if (add || take) {
    const amount = Number(prompt("Masukkan nominal:"));

    if (!Number.isFinite(amount) || amount <= 0) return;

    if (take && amount > saving.current) {
      showToast("Jumlah melebihi saldo tabungan.");
      return;
    }

    if (add && saving.current + amount > saving.target) {
      showToast("Jumlah melebihi target tabungan.");
      return;
    }

    saving.current += add ? amount : -amount;

    saveData();
    renderAll();

    showToast("Tabungan diperbarui.");
  }

  if (edit) {
    const name = prompt("Nama target:", saving.name);

    if (name === null || !name.trim()) return;

    const target = Number(
      prompt("Target nominal:", saving.target)
    );

    if (
      !Number.isFinite(target) ||
      target <= 0 ||
      target < saving.current
    ) {
      showToast("Target tidak valid.");
      return;
    }

    saving.name = name.trim();
    saving.target = target;

    saveData();
    renderAll();

    showToast("Target diperbarui.");
  }

  if (remove) {
    if (!confirmAction("Hapus target tabungan ini?")) return;

    data.savings = data.savings.filter(s => s.id !== id);

    saveData();
    renderAll();

    showToast("Target tabungan dihapus.");
  }
});

/* =========================================
   UTANG DAN PIUTANG
========================================= */

$("newDebtButton").addEventListener("click", () => {
  $("debtForm").classList.add("open");

  $("debtForm").scrollIntoView({
    behavior: "smooth"
  });
});

$("cancelDebt").addEventListener("click", () => {
  $("debtForm").classList.remove("open");
  $("debtForm").reset();
});

$("debtForm").addEventListener("submit", event => {
  event.preventDefault();

  const person = $("debtPerson").value.trim();
  const amount = Number($("debtAmount").value);

  if (
    !person ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    showToast("Masukkan nama dan nominal yang benar.");
    return;
  }

  data.debts.push({
    id: makeId(),
    type: $("debtType").value,
    person,
    amount,
    remaining: amount,
    note: $("debtNote").value.trim(),
    dueDate: $("debtDueDate").value
  });

  saveData();

  $("debtForm").reset();
  $("debtForm").classList.remove("open");

  renderAll();

  showToast("Catatan utang-piutang disimpan.");
});

function renderDebts() {
  const debts = data.debts;

  const totalDebt = debts
    .filter(d => d.type === "debt")
    .reduce((s, d) => s + Number(d.remaining), 0);

  const totalReceivable = debts
    .filter(d => d.type === "receivable")
    .reduce((s, d) => s + Number(d.remaining), 0);

  $("totalDebt").textContent = money(totalDebt);
  $("totalReceivable").textContent = money(totalReceivable);

  $("debtList").innerHTML = debts.length
    ? debts.map(d => `
      <article class="panel">
        <div class="section-heading">
          <strong>${escapeHTML(d.person)}</strong>

          <span class="${
            d.type === "debt"
              ? "amount-expense"
              : "amount-income"
          }">
            ${d.type === "debt"
              ? "Utang saya"
              : "Piutang saya"}
          </span>
        </div>

        <p class="muted">
          ${escapeHTML(d.note || "Tanpa catatan")}
        </p>

        <div class="report-row">
          <span>Nominal awal</span>
          <strong>${money(d.amount)}</strong>
        </div>

        <div class="report-row">
          <span>Sisa</span>
          <strong>${money(d.remaining)}</strong>
        </div>

        <small class="muted">
          Jatuh tempo:
          ${d.dueDate
            ? formatDate(d.dueDate)
            : "Tidak ditentukan"}
        </small>

        <div class="item-actions">
          <button data-debt-pay="${d.id}">
            Catat pembayaran
          </button>

          <button data-debt-edit="${d.id}">
            Ubah
          </button>

          <button
            class="delete-button"
            data-debt-delete="${d.id}">
            Hapus
          </button>
        </div>
      </article>
    `).join("")
    : `<p class="muted">Belum ada catatan utang atau piutang.</p>`;
}

$("debtList").addEventListener("click", event => {
  const pay = event.target.closest("[data-debt-pay]");
  const edit = event.target.closest("[data-debt-edit]");
  const remove = event.target.closest("[data-debt-delete]");

  const button = pay || edit || remove;

  if (!button) return;

  const id =
    button.dataset.debtPay ||
    button.dataset.debtEdit ||
    button.dataset.debtDelete;

  const debt = data.debts.find(d => d.id === id);

  if (!debt) return;

  if (pay) {
    if (debt.remaining <= 0) {
      showToast("Catatan ini sudah lunas.");
      return;
    }

    const amount = Number(prompt(
      `Sisa saat ini ${money(debt.remaining)}. Masukkan pembayaran:`
    ));

    if (!Number.isFinite(amount) || amount <= 0) return;

    if (amount > debt.remaining) {
      showToast("Pembayaran melebihi sisa catatan.");
      return;
    }

    debt.remaining -= amount;

    saveData();
    renderAll();

    showToast("Sisa utang-piutang diperbarui.");
  }

  if (edit) {
    const person = prompt("Nama orang:", debt.person);

    if (person === null || !person.trim()) return;

    const note = prompt("Catatan:", debt.note || "");

    if (note === null) return;

    debt.person = person.trim();
    debt.note = note.trim();

    saveData();
    renderAll();

    showToast("Catatan diperbarui.");
  }

  if (remove) {
    if (!confirmAction("Hapus catatan ini?")) return;

    data.debts = data.debts.filter(d => d.id !== id);

    saveData();
    renderAll();

    showToast("Catatan dihapus.");
  }
});

/* =========================================
   ANGGARAN
========================================= */

$("budgetForm").addEventListener("submit", event => {
  event.preventDefault();

  const amount = Number($("budgetLimit").value);

  if (!Number.isFinite(amount) || amount < 0) {
    showToast("Masukkan nominal anggaran yang benar.");
    return;
  }

  data.budget = amount;

  saveData();
  renderBudget();

  showToast("Anggaran disimpan.");
});

function renderBudget() {
  $("budgetLimit").value = data.budget || "";

  const expense = sumTransactions("expense", currentMonth());
  const limit = Number(data.budget) || 0;

  const percent = limit > 0
    ? Math.round((expense / limit) * 100)
    : 0;

  $("budgetPercent").textContent = percent + "%";

  $("budgetProgress").style.width =
    Math.min(percent, 100) + "%";

  $("budgetInfo").textContent = limit > 0
    ? `Terpakai ${money(expense)} dari ${money(limit)}. ` +
      (expense > limit
        ? `Melebihi anggaran sebesar ${money(expense - limit)}.`
        : `Sisa anggaran ${money(limit - expense)}.`)
    : "Atur anggaran untuk memantau pengeluaran bulanan.";
}

/* =========================================
   LAPORAN
========================================= */

function renderReports() {
  const month = $("reportMonth").value || currentMonth();

  const transactions = data.transactions.filter(t =>
    t.date.startsWith(month)
  );

  const income = transactions
    .filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const expense = transactions
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  $("reportIncome").textContent = money(income);
  $("reportExpense").textContent = money(expense);
  $("reportDifference").textContent = money(income - expense);

  const categories = {};

  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      const category = t.category || "Lainnya";

      categories[category] =
        (categories[category] || 0) + Number(t.amount);
    });

  const sorted = Object.entries(categories)
    .sort((a, b) => b[1] - a[1]);

  $("categoryReport").innerHTML = sorted.length
    ? sorted.map(([category, amount]) => `
      <div class="report-row">
        <span>${escapeHTML(category)}</span>
        <strong>${money(amount)}</strong>
      </div>
    `).join("")
    : `<p class="muted">Belum ada pengeluaran pada bulan ini.</p>`;
}

$("reportMonth").value = currentMonth();

$("reportMonth").addEventListener("change", () => {
  renderReports();
});

/* =========================================
   KALKULATOR
========================================= */

const calcDisplay = $("calcDisplay");

document.querySelector(".calculator-grid").addEventListener(
  "click",
  event => {
    const button = event.target.closest("[data-calc]");

    if (!button) return;

    const value = button.dataset.calc;

    if (value === "clear") {
      calcExpression = "";
      calcDisplay.value = "";
      return;
    }

    if (value === "back") {
      calcExpression = calcExpression.slice(0, -1);
      calcDisplay.value = calcExpression;
      return;
    }

    if (value === "equals") {
      calculateExpression();
      return;
    }

    const allowed = "0123456789.+-*/()%";

    if (allowed.includes(value)) {
      calcExpression += value;
      calcDisplay.value = calcExpression;
    }
  }
);

function calculateExpression() {
  if (!calcExpression.trim()) return;

  try {
    const result = safeCalculate(calcExpression);

    if (!Number.isFinite(result)) {
      throw new Error("Hasil tidak valid");
    }

    calcExpression = String(
      Number(result.toFixed(10))
    );

    calcDisplay.value = calcExpression;

  } catch (error) {
    console.error("Kesalahan kalkulator:", error);

    calcDisplay.value = "Error";
    calcExpression = "";

    showToast("Perhitungan tidak valid. Periksa angka dan operator.");
  }
}

/*
  Kalkulator mendukung:
  Tambah       +
  Kurang       -
  Kali         *
  Bagi         /
  Persen       %
  Kurung       ( )
  Desimal      .

  Contoh:
  50000*10%  = 5000
  50000+10%  = 55000
  50000-10%  = 45000
  20000/2    = 10000
  (100+50)*2 = 300
*/

function safeCalculate(expression) {
  const cleanExpression = expression.replace(/\s/g, "");

  const tokens = cleanExpression.match(
    /(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g
  );

  if (
    !tokens ||
    tokens.join("") !== cleanExpression
  ) {
    throw new Error("Karakter tidak valid");
  }

  let position = 0;

  function parseExpression() {
    let left = parseTerm().value;

    while (
      tokens[position] === "+" ||
      tokens[position] === "-"
    ) {
      const operator = tokens[position++];
      const right = parseTerm();

      let rightValue = right.value;

      /*
        Untuk penjumlahan dan pengurangan:
        50000 + 10% = 55000
        50000 - 10% = 45000
      */

      if (right.simplePercent) {
        rightValue = left * rightValue;
      }

      if (operator === "+") {
        left += rightValue;
      } else {
        left -= rightValue;
      }
    }

    return left;
  }

  function parseTerm() {
    let value = parseFactor();

    let hasMultiplication = false;

    while (
      tokens[position] === "*" ||
      tokens[position] === "/"
    ) {
      const operator = tokens[position++];
      const next = parseFactor();

      hasMultiplication = true;

      if (operator === "/" && next === 0) {
        throw new Error("Tidak bisa dibagi nol");
      }

      if (operator === "*") {
        value *= next;
      } else {
        value /= next;
      }
    }

    let hasPercent = false;

    if (tokens[position] === "%") {
      position++;
      value /= 100;
      hasPercent = true;
    }

    return {
      value,
      simplePercent: hasPercent && !hasMultiplication
    };
  }

  function parseFactor() {
    const token = tokens[position];

    if (token === "+") {
      position++;
      return parseFactor();
    }

    if (token === "-") {
      position++;
      return -parseFactor();
    }

    if (token === "(") {
      position++;

      const value = parseExpression();

      if (tokens[position] !== ")") {
        throw new Error("Kurung tidak seimbang");
      }

      position++;

      return value;
    }

    if (
      token &&
      /^(\d+\.?\d*|\.\d+)$/.test(token)
    ) {
      position++;
      return Number(token);
    }

    throw new Error("Format angka salah");
  }

  const result = parseExpression();

  if (position !== tokens.length) {
    throw new Error("Format perhitungan salah");
  }

  return result;
}

/* =========================================
   TEMA GELAP
========================================= */

function applyTheme(theme) {
  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );

  $("themeButton").textContent =
    theme === "dark" ? "☀" : "☾";
}

applyTheme(
  localStorage.getItem(THEME_KEY) || "light"
);

$("themeButton").addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  localStorage.setItem(THEME_KEY, nextTheme);

  applyTheme(nextTheme);
});

/* =========================================
   KEAMANAN PIN
========================================= */

async function hashPin(pin) {
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(pin);

    const hash = await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return "fallback-" + btoa(pin);
}

async function savePin(pin) {
  const hashed = await hashPin(pin);

  localStorage.setItem(PIN_KEY, hashed);
}

function showLockScreen() {
  const savedPin = localStorage.getItem(PIN_KEY);

  if (!savedPin) return;

  $("lockScreen").classList.remove("hidden");

  $("lockMessage").textContent =
    "Masukkan PIN untuk membuka aplikasi.";
}

$("pinForm").addEventListener("submit", async event => {
  event.preventDefault();

  const pin = $("pinInput").value;
  const savedPin = localStorage.getItem(PIN_KEY);

  if (!savedPin) {
    $("lockScreen").classList.add("hidden");
    return;
  }

  if (await hashPin(pin) === savedPin) {
    $("lockScreen").classList.add("hidden");
    $("pinInput").value = "";
  } else {
    $("lockMessage").textContent =
      "PIN salah. Silakan coba lagi.";

    $("pinInput").value = "";
  }
});

$("pinSettingsForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const pin = $("newPin").value;

    if (!/^\d{4,6}$/.test(pin)) {
      showToast("PIN harus terdiri dari 4 sampai 6 angka.");
      return;
    }

    await savePin(pin);

    $("newPin").value = "";

    showToast("PIN berhasil disimpan.");
  }
);

$("removePinButton").addEventListener("click", () => {
  if (!localStorage.getItem(PIN_KEY)) {
    showToast("Belum ada PIN.");
    return;
  }

  if (!confirmAction("Hapus PIN aplikasi?")) return;

  localStorage.removeItem(PIN_KEY);

  showToast("PIN dihapus.");
});

showLockScreen();

/* =========================================
   EKSPOR DAN IMPOR JSON
========================================= */

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportButton").addEventListener("click", () => {
  const backup = {
    app: "Keuangan Saya",
    version: 5,
    exportedAt: new Date().toISOString(),
    data
  };

  downloadFile(
    JSON.stringify(backup, null, 2),
    "cadangan-keuangan-saya.json",
    "application/json"
  );

  showToast("Cadangan berhasil dibuat.");
});

$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const imported = backup.data || backup;

    if (
      !Array.isArray(imported.accounts) ||
      !Array.isArray(imported.transactions) ||
      !Array.isArray(imported.savings) ||
      !Array.isArray(imported.debts)
    ) {
      throw new Error("Format cadangan tidak sesuai.");
    }

    if (!confirmAction(
      "Impor akan mengganti data saat ini. Lanjutkan?"
    )) {
      event.target.value = "";
      return;
    }

    data = {
      accounts: imported.accounts,
      transactions: imported.transactions,
      savings: imported.savings,
      debts: imported.debts,
      budget: Number(imported.budget) || 0
    };

    if (saveData()) {
      renderAll();
      showToast("Data berhasil dipulihkan.");
    }

  } catch (error) {
    console.error(error);
    showToast("File cadangan tidak valid.");
  }

  event.target.value = "";
});

/* =========================================
   EKSPOR CSV
========================================= */

$("csvButton").addEventListener("click", () => {
  const rows = [
    [
      "Tanggal",
      "Jenis",
      "Keterangan",
      "Kategori",
      "Nominal",
      "Akun"
    ]
  ];

  data.transactions.forEach(t => {
    const account = t.type === "transfer"
      ? `${accountName(t.fromId)} ke ${accountName(t.toId)}`
      : accountName(t.accountId);

    rows.push([
      t.date,
      t.type,
      t.note || "",
      t.category || "",
      t.amount,
      account
    ]);
  });

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\n");

  downloadFile(
    "\uFEFF" + csv,
    "transaksi-keuangan.csv",
    "text/csv;charset=utf-8"
  );

  showToast("File CSV berhasil dibuat.");
});

/* =========================================
   HAPUS SEMUA DATA
========================================= */

$("resetDataButton").addEventListener("click", () => {
  const answer = prompt(
    'Ketik HAPUS untuk menghapus seluruh data keuangan.'
  );

  if (answer !== "HAPUS") {
    showToast("Penghapusan dibatalkan.");
    return;
  }

  data = defaultData();

  if (saveData()) {
    renderAll();
    showToast("Semua data keuangan telah dihapus.");
  }
});

/* =========================================
   RENDER SEMUA FITUR
========================================= */

function renderAll() {
  populateAccountSelects();
  renderDashboard();
  renderAccounts();
  renderTransactions();
  renderSavings();
  renderDebts();
  renderBudget();
  renderReports();
}

renderAll();

/* =========================================
   SERVICE WORKER / OFFLINE
========================================= */

if (
  "serviceWorker" in navigator &&
  location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => {
        console.log("Service Worker aktif.");
      })
      .catch(error => {
        console.error("Service Worker gagal:", error);
      });
  });
}

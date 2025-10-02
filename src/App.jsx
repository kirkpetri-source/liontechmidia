// src/App.jsx - VERSÃO CORRIGIDA COM LOGIN E MELHORIAS
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, Users, TrendingUp, AlertTriangle, Tv, Plus, Edit2, Trash2, Check, X, Send, MapPin, FileText, Phone, Filter, Repeat, Lock, Download, Cloud, Settings, LogOut, Eye, EyeOff } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const LionTechDashboard = () => {
  // SISTEMA DE LOGIN
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Credenciais padrão (armazenadas no localStorage)
  const [credentials, setCredentials] = useState(() => {
    const stored = localStorage.getItem('liontech_credentials');
    return stored ? JSON.parse(stored) : { username: 'admin', password: 'liontech2025' };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showContract, setShowContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [tvPoints, setTvPoints] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);

  const [clientFilter, setClientFilter] = useState('Ativo');
  const [chargeMonthFilter, setChargeMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [showPointForm, setShowPointForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  const [pointForm, setPointForm] = useState({ name: '', location: '', monthlyValue: '', status: 'Ativo' });
  const [clientForm, setClientForm] = useState({ name: '', cpfCnpj: '', contact: '', phone: '', email: '', selectedPoints: [], discountValue: 0, isPermuta: false, contractStartDate: '', contractEndDate: '', contractType: 'Indeterminado', dueDay: '', status: 'Ativo' });

  useEffect(() => {
    if (isLoggedIn) {
      loadAllData();
    }
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === credentials.username && loginForm.password === credentials.password) {
      setIsLoggedIn(true);
      setLoginForm({ username: '', password: '' });
    } else {
      alert('❌ Usuário ou senha incorretos!');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      setIsLoggedIn(false);
      setActiveTab('dashboard');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (changePasswordForm.currentPassword !== credentials.password) {
      alert('❌ Senha atual incorreta!');
      return;
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      alert('❌ As senhas não coincidem!');
      return;
    }
    if (changePasswordForm.newPassword.length < 6) {
      alert('❌ A nova senha deve ter pelo menos 6 caracteres!');
      return;
    }
    const newCredentials = { ...credentials, password: changePasswordForm.newPassword };
    setCredentials(newCredentials);
    localStorage.setItem('liontech_credentials', JSON.stringify(newCredentials));
    setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowSettings(false);
    alert('✅ Senha alterada com sucesso!');
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const pointsSnapshot = await getDocs(collection(db, 'tvPoints'));
      const pointsData = pointsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const paymentsData = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setTvPoints(pointsData);
      setClients(clientsData);
      setPayments(paymentsData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('❌ Erro ao carregar. Verifique Firebase.');
      setLoading(false);
    }
  };

  const calculateClientMonthly = (selectedPoints, discountValue = 0) => {
    const total = selectedPoints.reduce((sum, pointId) => {
      const point = tvPoints.find(p => p.id === pointId);
      return sum + (point?.monthlyValue || 0);
    }, 0);
    return Math.max(0, total - discountValue);
  };

  const generateContract = (client) => {
    const selectedPointsDetails = client.selectedPoints.map(pid => tvPoints.find(p => p.id === pid)).filter(Boolean);
    const finalValue = calculateClientMonthly(client.selectedPoints, client.discountValue);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrato ${client.name}</title></head><body><h1>CONTRATO - ${client.name}</h1><p>Valor: R$ ${finalValue.toFixed(2)}</p></body></html>`;
  };

  const viewContract = (client) => setShowContract(client);
  const printContractFromModal = () => { if (!showContract) return; const contractHTML = generateContract(showContract); const printWindow = window.open('', '_blank'); if (printWindow) { printWindow.document.write(contractHTML); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 250); } };
  const downloadContract = () => { if (!showContract) return; const contractHTML = generateContract(showContract); const blob = new Blob([contractHTML], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Contrato_${showContract.name.replace(/\s+/g, '_')}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };

  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'Ativo' && !c.isPermuta).length;
    const activePermutaClients = clients.filter(c => c.status === 'Ativo' && c.isPermuta).length;
    const activePoints = tvPoints.filter(p => p.status === 'Ativo').length;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthPayments = payments.filter(p => p.month === currentMonth);
    const monthlyRevenue = currentMonthPayments.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.value, 0);
    const expectedRevenue = currentMonthPayments.reduce((sum, p) => sum + p.value, 0);
    const permutaRevenue = clients.filter(c => c.status === 'Ativo' && c.isPermuta).reduce((sum, c) => sum + calculateClientMonthly(c.selectedPoints, c.discountValue), 0);
    const overdue = currentMonthPayments.filter(p => p.status === 'Atrasado').length;
    const overdueAmount = currentMonthPayments.filter(p => p.status === 'Atrasado').reduce((sum, p) => sum + p.value, 0);
    const totalDiscountsGiven = currentMonthPayments.reduce((sum, p) => sum + (p.discountApplied || 0), 0);
    return { activeClients, activePermutaClients, activePoints, totalClients: clients.length, totalPoints: tvPoints.length, monthlyRevenue, expectedRevenue, permutaRevenue, overdue, overdueAmount, totalDiscountsGiven };
  }, [clients, tvPoints, payments]);

  const generateMonthlyCharges = async () => {
    try {
      setSyncing(true);
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().slice(0, 7);
      let generatedCount = 0;
      
      for (const client of clients) {
        if (client.status !== 'Ativo' || client.isPermuta) continue;
        const existingPayment = payments.find(p => p.clientId === client.id && p.month === currentMonth);
        if (!existingPayment) {
          const monthlyValue = calculateClientMonthly(client.selectedPoints, client.discountValue);
          const dueDate = `${currentMonth}-${String(client.dueDay).padStart(2, '0')}`;
          await addDoc(collection(db, 'payments'), {
            clientId: client.id,
            month: currentMonth,
            value: monthlyValue,
            discountApplied: client.discountValue,
            dueDate: dueDate,
            paidDate: null,
            status: new Date(dueDate) < currentDate ? 'Atrasado' : 'Pendente'
          });
          generatedCount++;
        }
      }
      
      await loadAllData();
      setSyncing(false);
      alert(generatedCount > 0 ? `✅ ${generatedCount} cobrança(s) gerada(s)!` : 'ℹ️ Todas já foram geradas!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao gerar cobranças');
      setSyncing(false);
    }
  };

  const sendWhatsAppCharge = (clientId, paymentId) => {
    const client = clients.find(c => c.id === clientId);
    const payment = payments.find(p => p.id === paymentId);
    if (!client || !payment) return;
    const message = `Olá ${client.contact}!\n\nMensalidade: R$ ${payment.value.toFixed(2)}\nVencimento: ${new Date(payment.dueDate).toLocaleDateString('pt-BR')}\n\nObrigado!`;
    window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAddPoint = async () => {
    if (!pointForm.name || !pointForm.monthlyValue) { alert('❌ Preencha todos os campos!'); return; }
    try {
      setSyncing(true);
      await addDoc(collection(db, 'tvPoints'), {
        name: pointForm.name.toUpperCase(),
        location: pointForm.location.toUpperCase(),
        monthlyValue: parseFloat(pointForm.monthlyValue),
        status: pointForm.status
      });
      await loadAllData();
      setPointForm({ name: '', location: '', monthlyValue: '', status: 'Ativo' });
      setShowPointForm(false);
      setSyncing(false);
      alert('✅ Ponto adicionado!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao adicionar');
      setSyncing(false);
    }
  };

  const handleUpdatePoint = async () => {
    try {
      setSyncing(true);
      await updateDoc(doc(db, 'tvPoints', editingPoint), {
        name: pointForm.name.toUpperCase(),
        location: pointForm.location.toUpperCase(),
        monthlyValue: parseFloat(pointForm.monthlyValue),
        status: pointForm.status
      });
      await loadAllData();
      setEditingPoint(null);
      setPointForm({ name: '', location: '', monthlyValue: '', status: 'Ativo' });
      setSyncing(false);
      alert('✅ Atualizado!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao atualizar');
      setSyncing(false);
    }
  };

  const confirmDeletePoint = (id) => {
    const linkedClients = clients.filter(c => c.selectedPoints.includes(id));
    if (linkedClients.length > 0) { alert(`❌ Ponto vinculado a ${linkedClients.length} cliente(s)`); return; }
    setConfirmDelete({ type: 'point', id });
    setDeletePassword('');
  };

  const executeDeletePoint = async () => {
    if (deletePassword !== credentials.password) { alert('❌ Senha incorreta!'); return; }
    if (confirmDelete && confirmDelete.type === 'point') {
      try {
        setSyncing(true);
        await deleteDoc(doc(db, 'tvPoints', confirmDelete.id));
        await loadAllData();
        setConfirmDelete(null);
        setDeletePassword('');
        setSyncing(false);
        alert('✅ Excluído!');
      } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao excluir');
        setSyncing(false);
      }
    }
  };

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.cpfCnpj || !clientForm.phone || clientForm.selectedPoints.length === 0 || !clientForm.dueDay || !clientForm.contractStartDate) { alert('❌ Preencha todos os campos!'); return; }
    if (clientForm.contractType === 'Determinado' && !clientForm.contractEndDate) { alert('❌ Informe data de término!'); return; }
    try {
      setSyncing(true);
      await addDoc(collection(db, 'clients'), {
        name: clientForm.name.toUpperCase(),
        cpfCnpj: clientForm.cpfCnpj,
        contact: clientForm.contact.toUpperCase(),
        phone: clientForm.phone,
        email: clientForm.email.toLowerCase(),
        selectedPoints: clientForm.selectedPoints,
        discountValue: parseFloat(clientForm.discountValue) || 0,
        isPermuta: clientForm.isPermuta,
        contractStartDate: clientForm.contractStartDate,
        contractEndDate: clientForm.contractEndDate,
        contractType: clientForm.contractType,
        dueDay: parseInt(clientForm.dueDay),
        status: clientForm.status,
        createdAt: new Date().toISOString().split('T')[0]
      });
      await loadAllData();
      setClientForm({ name: '', cpfCnpj: '', contact: '', phone: '', email: '', selectedPoints: [], discountValue: 0, isPermuta: false, contractStartDate: '', contractEndDate: '', contractType: 'Indeterminado', dueDay: '', status: 'Ativo' });
      setShowClientForm(false);
      setSyncing(false);
      alert('✅ Cliente adicionado!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao adicionar');
      setSyncing(false);
    }
  };

  const handleUpdateClient = async () => {
    if (clientForm.contractType === 'Determinado' && !clientForm.contractEndDate) { alert('❌ Informe data de término!'); return; }
    try {
      setSyncing(true);
      await updateDoc(doc(db, 'clients', editingClient), {
        name: clientForm.name.toUpperCase(),
        cpfCnpj: clientForm.cpfCnpj,
        contact: clientForm.contact.toUpperCase(),
        phone: clientForm.phone,
        email: clientForm.email.toLowerCase(),
        selectedPoints: clientForm.selectedPoints,
        discountValue: parseFloat(clientForm.discountValue) || 0,
        isPermuta: clientForm.isPermuta,
        contractStartDate: clientForm.contractStartDate,
        contractEndDate: clientForm.contractEndDate,
        contractType: clientForm.contractType,
        dueDay: parseInt(clientForm.dueDay),
        status: clientForm.status
      });
      await loadAllData();
      setEditingClient(null);
      setClientForm({ name: '', cpfCnpj: '', contact: '', phone: '', email: '', selectedPoints: [], discountValue: 0, isPermuta: false, contractStartDate: '', contractEndDate: '', contractType: 'Indeterminado', dueDay: '', status: 'Ativo' });
      setSyncing(false);
      alert('✅ Atualizado!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao atualizar');
      setSyncing(false);
    }
  };

  const confirmDeleteClient = (id) => { setConfirmDelete({ type: 'client', id }); setDeletePassword(''); };
  
  const executeDeleteClient = async () => {
    if (deletePassword !== credentials.password) { alert('❌ Senha incorreta!'); return; }
    if (confirmDelete && confirmDelete.type === 'client') {
      try {
        setSyncing(true);
        await deleteDoc(doc(db, 'clients', confirmDelete.id));
        const clientPayments = payments.filter(p => p.clientId === confirmDelete.id);
        for (const payment of clientPayments) {
          await deleteDoc(doc(db, 'payments', payment.id));
        }
        await loadAllData();
        setConfirmDelete(null);
        setDeletePassword('');
        setSyncing(false);
        alert('✅ Excluído!');
      } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao excluir');
        setSyncing(false);
      }
    }
  };

  const togglePointSelection = (pointId) => { setClientForm(prev => ({ ...prev, selectedPoints: prev.selectedPoints.includes(pointId) ? prev.selectedPoints.filter(id => id !== pointId) : [...prev.selectedPoints, pointId] })); };
  
  const markAsPaid = async (paymentId) => {
    try {
      setSyncing(true);
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'Pago',
        paidDate: new Date().toISOString().split('T')[0]
      });
      await loadAllData();
      setSyncing(false);
      alert('✅ Marcado como pago!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro');
      setSyncing(false);
    }
  };

  const filteredClients = useMemo(() => clients.filter(c => c.status === clientFilter), [clients, clientFilter]);
  const filteredPayments = useMemo(() => payments.filter(p => p.month === chargeMonthFilter), [payments, chargeMonthFilter]);
  const availableMonths = useMemo(() => {
    const months = [...new Set(payments.map(p => p.month))];
    return months.length > 0 ? months.sort().reverse() : [new Date().toISOString().slice(0, 7)];
  }, [payments]);
  const revenueByMonth = useMemo(() => { const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10']; return months.map(month => ({ month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }), value: payments.filter(p => p.month === month && p.status === 'Pago').reduce((sum, p) => sum + p.value, 0) })); }, [payments]);
  const pointsRevenue = useMemo(() => tvPoints.map(point => ({ name: point.name.split(' - ')[0], clients: clients.filter(c => c.selectedPoints.includes(point.id) && c.status === 'Ativo').length })), [tvPoints, clients]);

  // TELA DE LOGIN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tv size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">LION TECH MÍDIA</h1>
            <p className="text-slate-600 mt-2">Sistema de Gestão</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Digite seu usuário"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
            >
              Entrar
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Credenciais padrão:</p>
            <p className="font-mono bg-slate-100 p-2 rounded mt-2">
              Usuário: <strong>admin</strong><br/>
              Senha: <strong>liontech2025</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Carregando da nuvem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={`fixed top-4 right-4 z-50 ${syncing ? 'bg-blue-500' : 'bg-emerald-500'} text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2`}>
        {syncing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Sincronizando...
          </>
        ) : (
          <>
            <Cloud size={16} />
            Salvo na Nuvem
          </>
        )}
      </div>

      {/* MODAL DE CONFIGURAÇÕES */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Configurações</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário Atual</label>
                <input type="text" value={credentials.username} disabled className="w-full border rounded-lg px-4 py-2 bg-slate-100" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Senha Atual</label>
                <input
                  type="password"
                  value={changePasswordForm.currentPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, currentPassword: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nova Senha</label>
                <input
                  type="password"
                  value={changePasswordForm.newPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, newPassword: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                  minLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={changePasswordForm.confirmPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, confirmPassword: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">Alterar Senha</button>
                <button type="button" onClick={() => setShowSettings(false)} className="flex-1 bg-slate-300 px-4 py-2 rounded-lg font-semibold">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Contrato - {showContract.name}</h3>
              <button onClick={() => setShowContract(null)} className="text-slate-500 hover:text-slate-700"><X size={24} /></button>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={printContractFromModal} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold">Imprimir</button>
              <button onClick={downloadContract} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Baixar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-lg"><Lock className="text-red-600" size={24} /></div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-600 mb-4">Tem certeza?</p>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Digite sua senha" className="w-full border rounded-lg px-4 py-2 mb-4" />
            <div className="flex gap-2">
              <button onClick={confirmDelete.type === 'client' ? executeDeleteClient : executeDeletePoint} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
              <button onClick={() => { setConfirmDelete(null); setDeletePassword(''); }} className="flex-1 bg-slate-300 px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg"><Tv size={32} /></div>
              <div>
                <h1 className="text-2xl font-bold">LION TECH MÍDIA</h1>
                <p className="text-slate-300 text-sm">Sistema com Firebase</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(true)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg" title="Configurações">
                <Settings size={20} />
              </button>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg flex items-center gap-2">
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[{ id: 'dashboard', label: 'Dashboard', icon: TrendingUp }, { id: 'points', label: 'Pontos', icon: Tv }, { id: 'clients', label: 'Clientes', icon: Users }, { id: 'charges', label: 'Cobranças', icon: FileText }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 font-medium flex items-center gap-2 ${activeTab === tab.id ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-600'}`}>
                <tab.icon size={18} />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
                <p className="text-slate-600 text-sm">Receita Mês</p>
                <p className="text-3xl font-bold text-slate-900">R$ {metrics.monthlyRevenue.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <p className="text-slate-600 text-sm">Permuta</p>
                <p className="text-3xl font-bold text-slate-900">R$ {metrics.permutaRevenue.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <p className="text-slate-600 text-sm">Descontos</p>
                <p className="text-3xl font-bold text-slate-900">R$ {metrics.totalDiscountsGiven.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
                <p className="text-slate-600 text-sm">Clientes</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.activeClients}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                <p className="text-slate-600 text-sm">Atrasados</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.overdue}</p>
              </div>
            </div>

            <div className="bg-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Gerar Cobranças do Mês</h3>
                  <p className="text-emerald-100 text-sm">Crie cobranças automáticas</p>
                </div>
                <button onClick={generateMonthlyCharges} className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 flex items-center gap-2">
                  <Plus size={20} /> Gerar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">Receita</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">Clientes por Ponto</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={pointsRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="clients" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'points' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Pontos de TV</h2>
              <button onClick={() => setShowPointForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} />Novo</button>
            </div>

            {(showPointForm || editingPoint) && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">{editingPoint ? 'Editar' : 'Novo'} Ponto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome *" value={pointForm.name} onChange={(e) => setPointForm({...pointForm, name: e.target.value})} className="border rounded-lg px-4 py-2" />
                  <input type="text" placeholder="Localização" value={pointForm.location} onChange={(e) => setPointForm({...pointForm, location: e.target.value})} className="border rounded-lg px-4 py-2" />
                  <input type="number" placeholder="Valor *" value={pointForm.monthlyValue} onChange={(e) => setPointForm({...pointForm, monthlyValue: e.target.value})} className="border rounded-lg px-4 py-2" />
                  <select value={pointForm.status} onChange={(e) => setPointForm({...pointForm, status: e.target.value})} className="border rounded-lg px-4 py-2">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={editingPoint ? handleUpdatePoint : handleAddPoint} className="bg-emerald-600 text-white px-6 py-2 rounded-lg">{editingPoint ? 'Atualizar' : 'Adicionar'}</button>
                  <button onClick={() => { setShowPointForm(false); setEditingPoint(null); setPointForm({ name: '', location: '', monthlyValue: '', status: 'Ativo' }); }} className="bg-slate-300 px-6 py-2 rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tvPoints.map(point => (
                <div key={point.id} className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
                  <h3 className="font-bold text-lg">{point.name}</h3>
                  <p className="text-sm text-slate-600">{point.location}</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-3">R$ {point.monthlyValue}/mês</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => { setEditingPoint(point.id); setPointForm(point); }} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm font-semibold">
                      <Edit2 size={14} />Editar
                    </button>
                    <button onClick={() => confirmDeletePoint(point.id)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm font-semibold">
                      <Trash2 size={14} />Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Clientes</h2>
              <div className="flex gap-2">
                <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="border rounded-lg px-3 py-2">
                  <option value="Ativo">Ativos</option>
                  <option value="Inativo">Inativos</option>
                </select>
                <button onClick={() => setShowClientForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} />Novo</button>
              </div>
            </div>

            {(showClientForm || editingClient) && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">{editingClient ? 'Editar' : 'Novo'} Cliente</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome *" value={clientForm.name} onChange={(e) => setClientForm({...clientForm, name: e.target.value})} className="border rounded-lg px-4 py-2" />
                    <input type="text" placeholder="CPF/CNPJ *" value={clientForm.cpfCnpj} onChange={(e) => setClientForm({...clientForm, cpfCnpj: e.target.value})} className="border rounded-lg px-4 py-2" />
                    <input type="text" placeholder="Contato" value={clientForm.contact} onChange={(e) => setClientForm({...clientForm, contact: e.target.value})} className="border rounded-lg px-4 py-2" />
                    <input type="tel" placeholder="WhatsApp *" value={clientForm.phone} onChange={(e) => setClientForm({...clientForm, phone: e.target.value})} className="border rounded-lg px-4 py-2" />
                    <input type="email" placeholder="E-mail" value={clientForm.email} onChange={(e) => setClientForm({...clientForm, email: e.target.value})} className="border rounded-lg px-4 py-2" />
                    <input type="date" value={clientForm.contractStartDate} onChange={(e) => setClientForm({...clientForm, contractStartDate: e.target.value})} className="border rounded-lg px-4 py-2" placeholder="Data início contrato" />
                    <select value={clientForm.contractType} onChange={(e) => setClientForm({...clientForm, contractType: e.target.value})} className="border rounded-lg px-4 py-2">
                      <option value="Indeterminado">Indeterminado</option>
                      <option value="Determinado">Determinado</option>
                    </select>
                    {clientForm.contractType === 'Determinado' && <input type="date" value={clientForm.contractEndDate} onChange={(e) => setClientForm({...clientForm, contractEndDate: e.target.value})} className="border rounded-lg px-4 py-2" />}
                    <input type="number" placeholder="Dia Vencimento *" value={clientForm.dueDay} onChange={(e) => setClientForm({...clientForm, dueDay: e.target.value})} className="border rounded-lg px-4 py-2" min="1" max="31" />
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Desconto (R$)</label>
                      <input type="number" placeholder="0.00" value={clientForm.discountValue} onChange={(e) => setClientForm({...clientForm, discountValue: e.target.value})} className="w-full border rounded-lg px-4 py-2" min="0" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={clientForm.isPermuta} onChange={(e) => setClientForm({...clientForm, isPermuta: e.target.checked})} />
                      <span>Cliente Permuta</span>
                    </label>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Pontos de TV:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {tvPoints.filter(p => p.status === 'Ativo').map(point => (
                        <div key={point.id} onClick={() => togglePointSelection(point.id)} className={`p-3 border-2 rounded-lg cursor-pointer ${clientForm.selectedPoints.includes(point.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                          <p className="font-semibold text-sm">{point.name}</p>
                          <p className="text-emerald-600 font-bold">R$ {point.monthlyValue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={editingClient ? handleUpdateClient : handleAddClient} className="bg-emerald-600 text-white px-6 py-2 rounded-lg">{editingClient ? 'Atualizar' : 'Adicionar'}</button>
                  <button onClick={() => { setShowClientForm(false); setEditingClient(null); setClientForm({ name: '', cpfCnpj: '', contact: '', phone: '', email: '', selectedPoints: [], discountValue: 0, isPermuta: false, contractStartDate: '', contractEndDate: '', contractType: 'Indeterminado', dueDay: '', status: 'Ativo' }); }} className="bg-slate-300 px-6 py-2 rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                  <h3 className="font-bold text-lg flex items-center gap-2">{client.name} {client.isPermuta && <Repeat size={16} className="text-purple-600" />}</h3>
                  <p className="text-sm text-slate-600">{client.contact}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-3">R$ {calculateClientMonthly(client.selectedPoints, client.discountValue)}/mês</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => viewContract(client)} className="flex-1 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1 font-semibold">
                      <FileText size={14} />Contrato
                    </button>
                    <button onClick={() => { setEditingClient(client.id); setClientForm(client); }} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1 font-semibold">
                      <Edit2 size={14} />Editar
                    </button>
                    <button onClick={() => confirmDeleteClient(client.id)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1 font-semibold">
                      <Trash2 size={14} />Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'charges' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Cobranças</h2>
              <div className="flex gap-2">
                <select value={chargeMonthFilter} onChange={(e) => setChargeMonthFilter(e.target.value)} className="border rounded-lg px-3 py-2">
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>
                  ))}
                </select>
                <button onClick={generateMonthlyCharges} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} />Gerar</button>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
                <FileText className="mx-auto text-blue-600 mb-3" size={48} />
                <h3 className="text-xl font-bold text-blue-900 mb-2">Nenhuma cobrança encontrada</h3>
                <p className="text-blue-700 mb-4">Clique no botão "Gerar" para criar as cobranças do mês</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Valor</th>
                      <th className="px-4 py-3 text-left">Vencimento</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => {
                      const client = clients.find(c => c.id === payment.clientId);
                      if (!client) return null;
                      return (
                        <tr key={payment.id} className="border-t">
                          <td className="px-4 py-3"><p className="font-medium">{client.name}</p></td>
                          <td className="px-4 py-3 font-semibold">R$ {payment.value.toFixed(2)}</td>
                          <td className="px-4 py-3">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${payment.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{payment.status}</span></td>
                          <td className="px-4 py-3">
                            {payment.status !== 'Pago' && (
                              <div className="flex gap-2">
                                <button onClick={() => sendWhatsAppCharge(client.id, payment.id)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded" title="Enviar WhatsApp"><Send size={16} /></button>
                                <button onClick={() => markAsPaid(payment.id)} className="text-blue-600 hover:bg-blue-50 p-2 rounded" title="Marcar como pago"><Check size={16} /></button>
                              </div>
                            )}
                            {payment.status === 'Pago' && <span className="text-xs text-emerald-600 font-semibold">✓ Pago</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LionTechDashboard;

import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { Container, Navbar, Nav, Button, Row, Col, Card, Badge, Form, Modal, Table, Alert, InputGroup } from 'react-bootstrap'
import { db } from './firebase'
import { ref, onValue, push, update, remove, get } from 'firebase/database'
import { BrowserMultiFormatReader } from '@zxing/library'
import Quagga from '@ericblade/quagga2'
import Webcam from 'react-webcam'
// Chart.js - ONLY ONE IMPORT
import { Pie, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Lucide icons - ONLY ONE IMPORT - Calendar and Download are here
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle, Zap,
  Apple, Coffee, Shirt, Laptop, Home, ShoppingBasket, ArrowLeft,
  ShoppingCart, FileText, CreditCard, DollarSign, X, Check,
  TrendingUp, ShoppingBag, Calendar, Download, Filter, Truck, Book, Gift, Heart, Star
} from 'lucide-react'

import './App.css'

// Register Chart.js components ONCE
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)
function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)
  const [scannedText, setScannedText] = useState('')
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const codeReader = useRef(null)

  useEffect(() => {
    let mounted = true

    const startCamera = async () => {
      try {
        // Create reader with specific formats for better detection
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        const formats = [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE
        ]
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader.current = new BrowserMultiFormatReader(hints, 500) // 500ms scan interval

        // Request high-res camera with autofocus
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'continuous',
            advanced: [{ focusMode: 'continuous' }]
          }
        })

        if (!mounted) return

        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play()
        }

        // Start decoding with continuous scan
        codeReader.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (result && mounted) {
              const text = result.getText()
              console.log('Scanned:', text)
              setScannedText(text)
              setScanned(true)
              stopCamera()
              onScan(text)
            }
          }
        )

      } catch (err) {
        console.error('Camera error:', err)
        if (err.name === 'NotAllowedError') {
          setError('Camera blocked. Click the camera icon in address bar → Allow')
        } else if (err.name === 'NotFoundError') {
          setError('No webcam found. Check if laptop camera is enabled.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is being used by another app. Close Zoom/Teams.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      }
    }

    startCamera()

    return () => {
      mounted = false
      stopCamera()
    }
  }, [onScan])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (codeReader.current) {
      codeReader.current.reset()
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <Modal show onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Scan Barcode with Laptop Camera</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {error? (
          <Alert variant="danger">
            <AlertTriangle size={20} className="me-2" />
            {error}
            <div className="mt-3 small text-start">
              <strong>How to fix:</strong>
              <ol className="mb-0 mt-2">
                <li>Click the camera icon 🔒 in browser address bar</li>
                <li>Select "Allow" for camera</li>
                <li>Close Zoom/Teams if they're using camera</li>
                <li>Refresh page and try again</li>
              </ol>
            </div>
          </Alert>
        ) : scanned? (
          <div className="py-4">
            <Check size={64} className="text-success mb-3" />
            <h5 className="fw-bold text-success mb-2">Scanned Successfully!</h5>
            <p className="mb-3">
              <strong>Barcode:</strong> {scannedText}
            </p>
            <p className="text-muted small mb-4">Product added to cart</p>
            <Button variant="success" onClick={handleClose}>
              <Check size={18} className="me-1" /> Done
            </Button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  backgroundColor: '#000'
                }}
                autoPlay
                playsInline
                muted
              />
              {/* Scanning overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '250px',
                height: '150px',
                border: '3px solid #28a745',
                borderRadius: '8px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
              }}></div>
            </div>
            <p className="text-muted small mt-3 mb-1">
              <strong>Tips for scanning:</strong>
            </p>
            <ul className="text-muted small text-start" style={{ fontSize: '0.85rem' }}>
              <li>Hold phone 4-8 inches from camera</li>
              <li>Keep barcode inside the green box</li>
              <li>Max brightness on phone screen</li>
              <li>Hold steady - don't move</li>
              <li>Avoid glare - tilt phone slightly</li>
            </ul>
            <Button variant="danger" onClick={handleClose} className="mt-2">
              <X size={18} className="me-1" /> Stop Scanning
            </Button>
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/category/:categoryName" element={<CategoryDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/sales" element={<SalesHistoryPage />} />
        <Route path="/reports" element={<DailyReportPage />} />
      </Routes>
    </Router>
  )
}
function AppNavbar() {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm sticky-top">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2">
          <Package size={28} className="text-primary" />
          StockFlow
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="ms-auto align-items-lg-center gap-lg-1">
            <Button 
              as={Link} 
              to="/dashboard" 
              variant={isActive('/dashboard') ? 'primary' : 'outline-primary'} 
              className="ms-lg-3"
            >
              Dashboard
            </Button>
            <Nav.Link 
              as={Link} 
              to="/categories" 
              className={isActive('/categories') ? 'active' : ''}
            >
              Categories
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/sales"
              className={isActive('/sales') ? 'active' : ''}
            >
              Sales
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/reports"
              className={isActive('/reports') ? 'active' : ''}
            >
              Reports
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/checkout" 
              className={`d-flex align-items-center gap-1 ${isActive('/checkout') ? 'active' : ''}`}
            >
              <ShoppingCart size={18} /> Checkout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

function Footer() {
  return (
    <footer className="bg-dark text-white pt-5 pb-3 mt-5">
      <Container>
        <Row className="g-4 mb-4">
          <Col lg={6}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <Package size={28} className="text-primary" />
              <h5 className="mb-0 fw-bold">StockFlow</h5>
            </div>
            <p className="text-white-50 small">
              Real-time inventory management for modern businesses. Track stock, prevent overselling, and scale with confidence.
            </p>
          </Col>
          <Col lg={3} sm={6}>
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled small">
              <li className="mb-2"><Link to="/categories" className="text-white-50 text-decoration-none">Categories</Link></li>
              <li className="mb-2"><Link to="/dashboard" className="text-white-50 text-decoration-none">Dashboard</Link></li>
            </ul>
          </Col>
          <Col lg={3} sm={6}>
            <h6 className="fw-bold mb-3">Contact</h6>
            <ul className="list-unstyled small text-white-50">
              <li className="mb-2">support@stockflow.app</li>
              <li className="mb-2">+91 98765 43210</li>
              <li className="mb-2">Chennai, India</li>
            </ul>
          </Col>
        </Row>
        <hr className="border-secondary" />
        <p className="text-white-50 small mb-0 text-center">© 2026 StockFlow. All rights reserved.</p>
      </Container>
    </footer>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  return (
    <>
      <AppNavbar />
      <section className="py-5 bg-light">
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <Badge bg="primary-subtle" text="primary" className="mb-3 px-3 py-2">Trusted by 10,000+ businesses</Badge>
              <h1 className="display-4 fw-bold mb-3">Real-Time Inventory Management for Growing Teams</h1>
              <p className="lead text-muted mb-4">Stop using spreadsheets. StockFlow syncs your inventory across all devices instantly. Track stock, get alerts, and never oversell again.</p>
              <div className="d-flex gap-3 flex-wrap mb-4">
                <Button size="lg" onClick={() => navigate('/dashboard')}>
                  Start Free <Zap size={18} className="ms-1" />
                </Button>
                <Button size="lg" variant="outline-secondary" onClick={() => navigate('/categories')}>
                  Browse Categories
                </Button>
              </div>
            </Col>
            <Col lg={6}>
              <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80" alt="Warehouse" className="img-fluid rounded-4 shadow-lg" />
            </Col>
          </Row>
        </Container>
      </section>
      <Footer />
    </>
  )
}

// CATEGORY PAGE - Shows all categories
function CategoryPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Package', color: 'primary' })
  const [inventory, setInventory] = useState([])
  const [hasSeeded, setHasSeeded] = useState(false)

  const iconMap = {
    Package, Apple, Coffee, Shirt, Laptop, Home, ShoppingBasket,
    Truck, Book, Gift, Heart, Zap, Star
  }

  const colorOptions = ['primary', 'success', 'danger', 'warning', 'info', 'secondary', 'dark']

  useEffect(() => {
    const categoriesRef = ref(db, 'categories')
    const unsubCat = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setCategories(items)
      } else if (!hasSeeded) {
        // Seed defaults only once
        setHasSeeded(true)
        const defaults = [
          { name: 'Grocery', icon: 'Apple', color: 'success' },
          { name: 'Beverages', icon: 'Coffee', color: 'warning' },
          { name: 'Apparel', icon: 'Shirt', color: 'info' },
          { name: 'Electronics', icon: 'Laptop', color: 'primary' },
          { name: 'Home Goods', icon: 'Home', color: 'danger' }
        ]
        defaults.forEach(cat => push(ref(db, 'categories'), cat))
      }
    })

    const inventoryRef = ref(db, 'inventory')
    const unsubInv = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setInventory(items)
      } else {
        setInventory([])
      }
    })

    return () => {
      unsubCat()
      unsubInv()
    }
  }, [hasSeeded])

  const getProductCount = (categoryName) => {
    return inventory.filter(item => item.category === categoryName).length
  }

  const handleAddCategory = (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    if (categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
      alert('Category already exists!')
      return
    }

    push(ref(db, 'categories'), {
      name: newCategory.name.trim(),
      icon: newCategory.icon,
      color: newCategory.color
    })

    setNewCategory({ name: '', icon: 'Package', color: 'primary' })
    setShowAddModal(false)
  }

  const handleDeleteCategory = (id, name) => {
    const productCount = getProductCount(name)
    if (productCount > 0) {
      alert(`Cannot delete "${name}". It has ${productCount} products. Move or delete them first.`)
      return
    }
    if (window.confirm(`Delete category "${name}"?`)) {
      remove(ref(db, `categories/${id}`))
    }
  }

  const IconComponent = ({ iconName, size = 40 }) => {
    const Icon = iconMap[iconName] || Package
    return <Icon size={size} />
  }

  return (
    <>
      <AppNavbar />
      <Container className="py-5">
        <div className="d-flex align-items-center justify-content-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold display-5 mb-1">Shop by Category</h1>
            <p className="lead text-muted mb-0">Click a category to view all products</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="me-1" /> Add Category
          </Button>
        </div>

        <Row className="g-4">
          {categories.map((cat) => (
            <Col md={6} lg={4} key={cat.id}>
              <Card className="h-100 border-0 shadow-sm category-card position-relative">
                <Button
                  size="sm"
                  variant="danger"
                  className="position-absolute top-0 end-0 m-2 rounded-circle p-1"
                  style={{ width: '28px', height: '28px', zIndex: 10 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(cat.id, cat.name)
                  }}
                  title="Delete Category"
                >
                  <X size={14} />
                </Button>
                <Card.Body
                  className="text-center p-5"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/category/${cat.name}`)}
                >
                  <div className={`text-${cat.color} mb-3`}>
                    <IconComponent iconName={cat.icon} size={40} />
                  </div>
                  <h4 className="fw-bold">{cat.name}</h4>
                  <p className="text-muted mb-0">
                    {getProductCount(cat.name)} products
                  </p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {categories.length === 0 && (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <Package size={48} className="text-muted mb-3" />
              <h4>Loading Categories...</h4>
              <p className="text-muted">Setting up default categories</p>
            </Card.Body>
          </Card>
        )}

        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Add New Category</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleAddCategory}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Category Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Toys, Sports, Books"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Icon</Form.Label>
                <Form.Select
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                >
                  {Object.keys(iconMap).map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </Form.Select>
                <div className="mt-2 text-center">
                  <IconComponent iconName={newCategory.icon} size={32} />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Color Theme</Form.Label>
                <div className="d-flex gap-2 flex-wrap">
                  {colorOptions.map(color => (
                    <Button
                      key={color}
                      variant={newCategory.color === color ? color : `outline-${color}`}
                      size="sm"
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className="text-capitalize"
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Add Category</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
      <Footer />
    </>
  )
}


function Dashboard() {
  const [inventory, setInventory] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '', sku: '', quantity: '', price: '', category: '', lowStock: '',
    manufacturingDate: '', expiryDate: '', invoiceDate: '', invoiceNumber: '', supplierName: ''
  })

  const [categoryOptions, setCategoryOptions] = useState([])

  useEffect(() => {
    const categoriesRef = ref(db, 'categories')
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => value.name)
        setCategoryOptions(items)
      } else {
        setCategoryOptions([])
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const inventoryRef = ref(db, 'inventory')
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setInventory(items)
      } else {
        setInventory([])
      }
    })
    return () => unsubscribe()
  }, [])

  const categoryCounts = categoryOptions.map(cat => ({
    category: cat,
    count: inventory.filter(item => item.category === cat).length
  })).filter(c => c.count > 0)

  const pieData = {
    labels: categoryCounts.map(c => c.category),
    datasets: [
      {
        label: 'Products',
        data: categoryCounts.map(c => c.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderColor: '#fff',
        borderWidth: 3
      }
    ]
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: 'Product Distribution by Category',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} products (${percentage}%)`
          }
        }
      }
    }
  }

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    const itemData = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      lowStock: parseInt(formData.lowStock),
      manufacturingDate: formData.manufacturingDate,
      expiryDate: formData.expiryDate,
      invoiceDate: formData.invoiceDate,
      invoiceNumber: formData.invoiceNumber,
      supplierName: formData.supplierName,
      barcode: formData.sku
    }
    if (editingItem) {
      update(ref(db, `inventory/${editingItem.id}`), itemData)
    } else {
      push(ref(db, 'inventory'), itemData)
    }
    resetForm()
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      ...item,
      manufacturingDate: item.manufacturingDate || '',
      expiryDate: item.expiryDate || '',
      invoiceDate: item.invoiceDate || '',
      invoiceNumber: item.invoiceNumber || '',
      supplierName: item.supplierName || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this item?')) {
      remove(ref(db, `inventory/${id}`))
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', sku: '', quantity: '', price: '', category: '', lowStock: '',
      manufacturingDate: '', expiryDate: '', invoiceDate: '', invoiceNumber: '', supplierName: ''
    })
    setEditingItem(null)
    setShowModal(false)
  }

  const lowStockItems = inventory.filter(item => item.quantity <= item.lowStock).length
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.price, 0)

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100 py-4">
        <Container>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h1 className="fw-bold">Dashboard</h1>
            <Badge bg="success" className="d-flex align-items-center gap-2 px-3 py-2">
              <span className="pulse-dot"></span> Live
            </Badge>
          </div>

          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Total SKUs</p>
                  <h3 className="fw-bold mb-0">{inventory.length}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Low Stock Alerts</p>
                  <h3 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                    {lowStockItems} {lowStockItems > 0 && <AlertTriangle size={20} />}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Inventory Value</p>
                  <h3 className="fw-bold text-success mb-0">₹{totalValue.toLocaleString()}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* PIE CHART */}
          <Row className="g-3 mb-4">
            <Col lg={6} className="mx-auto">
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div style={{ height: '350px' }}>
                    {categoryCounts.length > 0 ? (
                      <Pie data={pieData} options={pieOptions} />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        <div className="text-center">
                          <Package size={48} className="mb-2" />
                          <p>No products yet</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row className="g-2">
                <Col md>
                  <div className="position-relative">
                    <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <Form.Control type="text" placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-5" />
                  </div>
                </Col>
                <Col md="auto">
                  <Button onClick={() => setShowModal(true)} className="w-100">
                    <Plus size={18} className="me-1" /> Add Product
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* TABLE INSTEAD OF CARDS */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th>Product</th>
                      <th>SKU / Barcode</th>
                      <th>Category</th>
                      <th className="text-center">Stock</th>
                      <th className="text-end">Price</th>
                      <th>Mfg / Exp</th>
                      <th>Supplier</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-5 text-muted">
                          <Package size={40} className="mb-2" />
                          <div>No products found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-semibold">{item.name}</div>

                          </td>
                          <td>
                            <div className="small">{item.sku}</div>
                            <img
                              src={`https://barcode.tec-it.com/barcode.ashx?data=${item.barcode || item.sku}&code=Code128&dpi=96`}
                              alt="Barcode"
                              style={{ maxWidth: '100px', height: '25px' }}
                              className="mt-1"
                            />
                          </td>
                          <td><Badge bg="secondary" className="fw-normal">{item.category}</Badge></td>
                          <td className="text-center">
                            <div className="fw-bold">{item.quantity}</div>
                            <div className="small text-muted">Alert: {item.lowStock}</div>
                          </td>
                          <td className="text-end fw-bold">₹{item.price.toLocaleString()}</td>
                          <td>
                            <div className="small">
                              <div>Mfg: {item.manufacturingDate || 'N/A'}</div>
                              <div className={item.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-danger fw-bold' : ''}>
                                Exp: {item.expiryDate || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="small">
                              <div>{item.supplierName || 'N/A'}</div>
                              {item.invoiceNumber && <div className="text-muted">#{item.invoiceNumber}</div>}
                            </div>
                          </td>
                          <td>
                            {item.quantity <= item.lowStock ? (
                              <Badge bg="danger">Low Stock</Badge>
                            ) : (
                              <Badge bg="success">In Stock</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1 justify-content-center">
                              <Button size="sm" variant="outline-primary" onClick={() => handleEdit(item)}>
                                <Edit2 size={14} />
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          <Modal show={showModal} onHide={resetForm} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{editingItem ? 'Edit Product' : 'Add New Product'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Product Name</Form.Label>
                      <Form.Control type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">SKU</Form.Label>
                      <Form.Control type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Category</Form.Label>
                      <Form.Select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                        <option value="">Select Category</option>
                        {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Image URL</Form.Label>
                      <Form.Control type="url" placeholder="Optional" value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Quantity</Form.Label>
                      <Form.Control type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Price ₹</Form.Label>
                      <Form.Control type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Low Stock Alert</Form.Label>
                      <Form.Control type="number" value={formData.lowStock} onChange={(e) => setFormData({ ...formData, lowStock: e.target.value })} required />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Manufacturing Date</Form.Label>
                      <Form.Control type="date" value={formData.manufacturingDate} onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Expiry Date</Form.Label>
                      <Form.Control type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Invoice Date</Form.Label>
                      <Form.Control type="date" value={formData.invoiceDate} onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Invoice Number</Form.Label>
                      <Form.Control type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Supplier Name</Form.Label>
                      <Form.Control type="text" value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                <Button variant="primary" type="submit">{editingItem ? 'Update' : 'Add'} Product</Button>
              </Modal.Footer>
            </Form>
          </Modal>
        </Container>
      </div>
      <Footer />
    </>
  )
}

// CHECKOUT PAGE 
function CheckoutPage() {
  const [inventory, setInventory] = useState([])
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('stockflow-cart')
    return saved? JSON.parse(saved) : []
  })
  const [search, setSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [gstPercent, setGstPercent] = useState(18)
  const [discount, setDiscount] = useState(0)
  const [showInvoice, setShowInvoice] = useState(false)
  const [lastInvoice, setLastInvoice] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanAlert, setScanAlert] = useState(null)
  const [lastScannedProduct, setLastScannedProduct] = useState(null)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('stockflow-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const inventoryRef = ref(db, 'inventory')
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id,...value }))
        setInventory(items)
      } else {
        setInventory([])
      }
    })
    return () => unsubscribe()
  }, [])

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase()) ||
    (item.barcode && item.barcode.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      if (existing.qty < item.quantity) {
        setCart(cart.map(c => c.id === item.id? {...c, qty: c.qty + 1 } : c))
        setScanAlert({ type: 'success', msg: `Added another ${item.name}` })
      } else {
        setScanAlert({ type: 'danger', msg: 'Not enough stock available!' })
      }
    } else {
      if (item.quantity > 0) {
        setCart([...cart, {...item, qty: 1 }])
        setScanAlert({ type: 'success', msg: `${item.name} added to cart` })
      } else {
        setScanAlert({ type: 'danger', msg: 'Item out of stock!' })
      }
    }
    setTimeout(() => setScanAlert(null), 3000)
  }

  // Handle barcode scan from camera
  const handleScan = (barcodeText) => {
    setShowScanner(false)
    const item = inventory.find(i =>
      i.sku === barcodeText ||
      i.barcode === barcodeText ||
      i.sku.toLowerCase() === barcodeText.toLowerCase()
    )

    if (item) {
      addToCart(item)
      setLastScannedProduct(item)
    } else {
      setScanAlert({ type: 'warning', msg: `No product found for barcode: ${barcodeText}` })
      setTimeout(() => setScanAlert(null), 3000)
    }
  }

  // Download Barcode as PNG - Fixed for cross-origin
  const downloadBarcode = async (product) => {
    try {
      const barcodeData = product.barcode || product.sku
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=Code128&dpi=96&imagetype=Png`

      const response = await fetch(barcodeUrl)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${product.sku}-barcode.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setScanAlert({ type: 'success', msg: 'Barcode downloaded!' })
      setTimeout(() => setScanAlert(null), 2000)
    } catch (error) {
      console.error('Download failed:', error)
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(product.barcode || product.sku)}&code=Code128&dpi=96&imagetype=Png`
      window.open(barcodeUrl, '_blank')
      setScanAlert({ type: 'info', msg: 'Barcode opened in new tab. Right-click to save.' })
      setTimeout(() => setScanAlert(null), 3000)
    }
  }

  const updateQty = (id, qty) => {
    const item = inventory.find(i => i.id === id)
    if (qty > item.quantity) {
      alert(`Only ${item.quantity} units available`)
      return
    }
    if (qty <= 0) {
      setCart(cart.filter(c => c.id!== id))
    } else {
      setCart(cart.map(c => c.id === id? {...c, qty } : c))
    }
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(c => c.id!== id))
  }

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete ${name}? This will remove it from inventory.`)) {
      remove(ref(db, `inventory/${id}`))
      setCart(cart.filter(c => c.id!== id))
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discountAmt = (subtotal * discount) / 100
  const taxableAmt = subtotal - discountAmt
  const gstAmt = (taxableAmt * gstPercent) / 100
  const total = taxableAmt + gstAmt

  const generateInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(1000 + Math.random() * 9000)
    return `INV-${year}${month}-${random}`
  }

  const handleCheckout = async () => {
    if (!customerName) {
      alert('Please enter customer name')
      return
    }
    if (cart.length === 0) {
      alert('Cart is empty')
      return
    }

    const invoiceNum = generateInvoiceNumber()
    const saleData = {
      invoiceNumber: invoiceNum,
      customerName,
      customerPhone,
      items: cart.map(c => ({
        name: c.name,
        sku: c.sku,
        qty: c.qty,
        price: c.price,
        total: c.price * c.qty
      })),
      subtotal,
      discount: discountAmt,
      gst: gstAmt,
      gstPercent,
      total,
      paymentMode,
      date: new Date().toISOString(),
      timestamp: Date.now()
    }

    await push(ref(db, 'sales'), saleData)

    const updates = {}
    cart.forEach(item => {
      const newQty = item.quantity - item.qty
      updates[`inventory/${item.id}/quantity`] = newQty
    })
    await update(ref(db), updates)

    setLastInvoice(saleData)
    setShowInvoice(true)
    setCart([])
    setLastScannedProduct(null)
    localStorage.removeItem('stockflow-cart')
    setCustomerName('')
    setCustomerPhone('')
    setDiscount(0)
  }

  const printInvoice = () => {
    window.print()
  }

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100 py-4">
        <Container fluid>
          <h1 className="fw-bold mb-4">Billing & Checkout</h1>

          {scanAlert && (
            <Alert variant={scanAlert.type} dismissible onClose={() => setScanAlert(null)} className="mb-3">
              {scanAlert.msg}
            </Alert>
          )}

          {lastScannedProduct && (
            <Alert variant="info" className="mb-3 d-flex align-items-center justify-content-between">
              <div>
                <strong>Last Scanned:</strong> {lastScannedProduct.name} ({lastScannedProduct.sku})
              </div>
              <Button size="sm" variant="primary" onClick={() => downloadBarcode(lastScannedProduct)}>
                <Download size={14} className="me-1" /> Download Barcode
              </Button>
            </Alert>
          )}

          <Row className="g-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <Row className="g-2 mb-3">
                    <Col>
                      <Form.Control
                        type="text"
                        placeholder="Search by name, SKU, or barcode..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </Col>
                    <Col xs="auto">
                      <Button variant="primary" onClick={() => setShowScanner(true)}>
                        <Zap size={18} className="me-1" /> Scan Barcode
                      </Button>
                    </Col>
                  </Row>

                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <Table hover responsive size="sm" className="align-middle">
                      <thead className="sticky-top bg-white">
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Stock</th>
                          <th>Price</th>
                          <th className="text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.length === 0? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                              <Package size={40} className="mb-2" />
                              <div>No products found</div>
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map(item => (
                            <tr
                              key={item.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedProduct(item)
                                setShowBarcodeModal(true)
                              }}
                            >
                              <td>
                                <div className="fw-semibold">{item.name}</div>
                                <Badge bg="secondary" className="fw-normal" style={{ fontSize: '0.7rem' }}>
                                  {item.category}
                                </Badge>
                              </td>
                              <td className="small text-muted">{item.sku}</td>
                              <td>
                                <Badge bg={item.quantity <= item.lowStock? 'danger' : 'success'}>
                                  {item.quantity}
                                </Badge>
                              </td>
                              <td className="fw-bold">₹{item.price}</td>
                              <td className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(item.id, item.name)
                                  }}
                                  title="Delete Product"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={5}>
              <Card className="border-0 shadow-sm sticky-top" style={{ top: '80px' }}>
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <ShoppingCart size={20} /> Cart ({cart.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  {cart.length === 0? (
                    <p className="text-muted text-center py-4">Cart is empty. Scan or click products to add.</p>
                  ) : (
                    <div className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {cart.map(item => (
                        <div key={item.id} className="border-bottom py-2">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <div className="flex-grow-1">
                              <div className="fw-semibold small">{item.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>₹{item.price} each</div>
                            </div>
                            <Button size="sm" variant="link" className="text-danger p-0" onClick={() => removeFromCart(item.id)}>
                              <X size={16} />
                            </Button>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <InputGroup size="sm" style={{ width: '120px' }}>
                              <Button variant="outline-secondary" onClick={() => updateQty(item.id, item.qty - 1)}>-</Button>
                              <Form.Control
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                                className="text-center"
                              />
                              <Button variant="outline-secondary" onClick={() => updateQty(item.id, item.qty + 1)}>+</Button>
                            </InputGroup>
                            <div className="ms-auto fw-bold">₹{(item.price * item.qty).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <hr />

                  <Form.Group className="mb-2">
                    <Form.Label className="small">Customer Name *</Form.Label>
                    <Form.Control
                      size="sm"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Phone</Form.Label>
                    <Form.Control
                      size="sm"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Optional"
                    />
                  </Form.Group>

                  <div className="small mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Subtotal:</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span>Discount %:</span>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        style={{ width: '80px' }}
                        className="text-end"
                      />
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Discount Amt:</span>
                      <span>-₹{discountAmt.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span>GST %:</span>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={gstPercent}
                        onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                        style={{ width: '80px' }}
                        className="text-end"
                      />
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>GST Amt:</span>
                      <span>₹{gstAmt.toFixed(2)}</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between fw-bold h5 mb-3">
                      <span>Total:</span>
                      <span className="text-success">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small">Payment Mode</Form.Label>
                    <Form.Select size="sm" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                    </Form.Select>
                  </Form.Group>

                  <Button
                    variant="success"
                    className="w-100"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                  >
                    <Check size={18} className="me-1" /> Complete Sale
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Barcode View Modal */}
      <Modal show={showBarcodeModal} onHide={() => setShowBarcodeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Product Barcode</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedProduct && (
            <>
              <h5 className="fw-bold mb-1">{selectedProduct.name}</h5>
              <p className="text-muted small mb-4">SKU: {selectedProduct.sku}</p>

              <div className="border rounded p-4 bg-light mb-3">
                <img
                  src={`https://barcode.tec-it.com/barcode.ashx?data=${selectedProduct.barcode || selectedProduct.sku}&code=Code128&dpi=96`}
                  alt="Barcode"
                  style={{ maxWidth: '100%', height: '80px' }}
                />
                <div className="mt-2 fw-semibold">{selectedProduct.barcode || selectedProduct.sku}</div>
              </div>

              <div className="d-grid gap-2">
                <Button variant="primary" onClick={() => downloadBarcode(selectedProduct)}>
                  <Download size={18} className="me-1" /> Download Barcode
                </Button>
                <Button variant="success" onClick={() => {
                  addToCart(selectedProduct)
                  setShowBarcodeModal(false)
                }}>
                  <Plus size={18} className="me-1" /> Add to Cart
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Invoice Modal */}
      <Modal show={showInvoice} onHide={() => setShowInvoice(false)} centered size="lg">
        <Modal.Header closeButton className="d-print-none">
          <Modal.Title>Tax Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body id="invoice-print">
          {lastInvoice && (
            <div className="p-3">
              <div className="text-center mb-4">
                <h2 className="fw-bold">StockFlow</h2>
                <p className="text-muted small mb-0">Inventory Management System</p>
                <hr />
                <h4 className="fw-bold">TAX INVOICE</h4>
              </div>

              <Row className="mb-3 small">
                <Col>
                  <strong>Invoice No:</strong> {lastInvoice.invoiceNumber}<br />
                  <strong>Date:</strong> {new Date(lastInvoice.date).toLocaleString()}
                </Col>
                <Col className="text-end">
                  <strong>Customer:</strong> {lastInvoice.customerName}<br />
                  <strong>Phone:</strong> {lastInvoice.customerPhone || 'N/A'}
                </Col>
              </Row>

              <Table bordered size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.name}<br /><small className="text-muted">{item.sku}</small></td>
                      <td>{item.qty}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Row>
                <Col md={6}>
                  <div className="text-center border p-2">
                    <img
                      src={`https://barcode.tec-it.com/barcode.ashx?data=${lastInvoice.invoiceNumber}&code=Code128&dpi=96`}
                      alt="Invoice Barcode"
                      style={{ maxWidth: '200px', height: '60px' }}
                    />
                    <div className="small text-muted">{lastInvoice.invoiceNumber}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <Table borderless size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Subtotal:</td>
                        <td className="text-end">₹{lastInvoice.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Discount:</td>
                        <td className="text-end">-₹{lastInvoice.discount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>GST ({lastInvoice.gstPercent}%):</td>
                        <td className="text-end">₹{lastInvoice.gst.toFixed(2)}</td>
                      </tr>
                      <tr className="fw-bold h5">
                        <td>Total:</td>
                        <td className="text-end">₹{lastInvoice.total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Payment:</td>
                        <td className="text-end text-uppercase">{lastInvoice.paymentMode}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>

              <div className="text-center mt-4 small text-muted">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-print-none">
          <Button variant="secondary" onClick={() => setShowInvoice(false)}>Close</Button>
          <Button variant="primary" onClick={printInvoice}>
            <FileText size={16} className="me-1" /> Print Invoice
          </Button>
        </Modal.Footer>
      </Modal>
      <Footer />
    </>
  )
}

// REPLACE CategoryDetailPage WITH THIS
function CategoryDetailPage() {
  const { categoryName } = useParams()
  const navigate = useNavigate()
  const [inventory, setInventory] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    invoiceDateFrom: '',
    invoiceDateTo: '',
    manufacturingDateFrom: '',
    manufacturingDateTo: '',
    expiryDateFrom: '',
    expiryDateTo: '',
    lowStockOnly: false
  })
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity: '',
    price: '',
    unit: 'packet',
    unitPrice: '',
    lowStock: '',
    manufacturingDate: '',
    expiryDate: '',
    invoiceDate: '',
    invoiceNumber: '',
    supplierName: ''
  })

  const categoryImages = {
    'Grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    'Beverages': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80',
    'Apparel': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
    'Home Goods': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=80',
    'General': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80'
  }

  useEffect(() => {
    const inventoryRef = ref(db, 'inventory')
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setInventory(items.filter(item => item.category === categoryName))
      } else {
        setInventory([])
      }
    })
    return () => unsubscribe()
  }, [categoryName])

  const generateSKU = () => {
    const prefix = categoryName.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${timestamp}`
  }

  const handleAddProduct = () => {
    setEditingItem(null)
    setFormData({
      name: '', sku: generateSKU(), quantity: '', price: '', unit: 'packet', unitPrice: '', lowStock: '', image: '',
      manufacturingDate: '', expiryDate: '', invoiceDate: '', invoiceNumber: '', supplierName: ''
    })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit || 'packet',
      unitPrice: item.unitPrice || item.price,
      lowStock: item.lowStock,
      manufacturingDate: item.manufacturingDate || '',
      expiryDate: item.expiryDate || '',
      invoiceDate: item.invoiceDate || '',
      invoiceNumber: item.invoiceNumber || '',
      supplierName: item.supplierName || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      remove(ref(db, `inventory/${id}`))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const itemData = {
      name: formData.name,
      sku: formData.sku,
      category: categoryName,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      unit: formData.unit,
      unitPrice: parseFloat(formData.unitPrice),
      lowStock: parseInt(formData.lowStock),
      manufacturingDate: formData.manufacturingDate,
      expiryDate: formData.expiryDate,
      invoiceDate: formData.invoiceDate,
      invoiceNumber: formData.invoiceNumber,
      supplierName: formData.supplierName,
      barcode: formData.sku
    }

    if (editingItem) {
      update(ref(db, `inventory/${editingItem.id}`), itemData)
    } else {
      push(ref(db, 'inventory'), itemData)
    }
    setShowModal(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: '', sku: '', quantity: '', price: '', unit: 'packet', unitPrice: '', lowStock: '',
      manufacturingDate: '', expiryDate: '', invoiceNumber: '', supplierName: ''
    })
    setEditingItem(null)
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (filters.invoiceDateFrom && item.invoiceDate) {
      if (new Date(item.invoiceDate) < new Date(filters.invoiceDateFrom)) return false
    }
    if (filters.invoiceDateTo && item.invoiceDate) {
      if (new Date(item.invoiceDate) > new Date(filters.invoiceDateTo)) return false
    }
    if (filters.manufacturingDateFrom && item.manufacturingDate) {
      if (new Date(item.manufacturingDate) < new Date(filters.manufacturingDateFrom)) return false
    }
    if (filters.manufacturingDateTo && item.manufacturingDate) {
      if (new Date(item.manufacturingDate) > new Date(filters.manufacturingDateTo)) return false
    }
    if (filters.expiryDateFrom && item.expiryDate) {
      if (new Date(item.expiryDate) < new Date(filters.expiryDateFrom)) return false
    }
    if (filters.expiryDateTo && item.expiryDate) {
      if (new Date(item.expiryDate) > new Date(filters.expiryDateTo)) return false
    }
    if (filters.lowStockOnly && item.quantity > item.lowStock) return false

    return true
  })

  const downloadCSV = () => {
    const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Price', 'Unit', 'Unit Price', 'Mfg Date', 'Expiry Date', 'Invoice Date', 'Invoice No', 'Supplier', 'Barcode']
    const rows = filteredInventory.map(item => [
      item.name, item.sku, item.category, item.quantity, item.price, item.unit || 'packet', item.unitPrice || '',
      item.manufacturingDate || '', item.expiryDate || '', item.invoiceDate || '', item.invoiceNumber || '',
      item.supplierName || '', item.barcode || item.sku
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${categoryName}_products_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setFilters({
      invoiceDateFrom: '', invoiceDateTo: '', manufacturingDateFrom: '', manufacturingDateTo: '',
      expiryDateFrom: '', expiryDateTo: '', lowStockOnly: false
    })
  }

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100 py-4">
        <Container>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/categories')} className="mb-4">
            <ArrowLeft size={16} className="me-1" /> Back to Categories
          </Button>

          <Card className="border-0 shadow-sm mb-4 overflow-hidden">
            <Row className="g-0">
              <Col md={4}>
                <img src={categoryImages[categoryName] || categoryImages['General']} alt={categoryName} className="img-fluid h-100" style={{ objectFit: 'cover', minHeight: '200px' }} />
              </Col>
              <Col md={8}>
                <Card.Body className="p-4">
                  <h1 className="fw-bold mb-2">{categoryName}</h1>
                  <p className="text-muted mb-3">{inventory.length} products in stock</p>
                  <Button onClick={handleAddProduct}>
                    <Plus size={18} className="me-1" /> Add Product to {categoryName}
                  </Button>
                </Card.Body>
              </Col>
            </Row>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row className="g-2 mb-3">
                <Col md>
                  <div className="position-relative">
                    <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <Form.Control type="text" placeholder={`Search in ${categoryName}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-5" />
                  </div>
                </Col>
                <Col md="auto">
                  <Button variant="outline-primary" onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={18} className="me-1" /> Filters
                  </Button>
                </Col>
                <Col md="auto">
                  <Button variant="success" onClick={downloadCSV} disabled={filteredInventory.length === 0}>
                    <Download size={18} className="me-1" /> Download CSV
                  </Button>
                </Col>
              </Row>

              {showFilters && (
                <div className="border-top pt-3">
                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Label className="small fw-semibold">Invoice Date Range</Form.Label>
                      <Row className="g-1">
                        <Col><Form.Control type="date" size="sm" value={filters.invoiceDateFrom} onChange={(e) => setFilters({ ...filters, invoiceDateFrom: e.target.value })} /></Col>
                        <Col><Form.Control type="date" size="sm" value={filters.invoiceDateTo} onChange={(e) => setFilters({ ...filters, invoiceDateTo: e.target.value })} /></Col>
                      </Row>
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small fw-semibold">Mfg Date Range</Form.Label>
                      <Row className="g-1">
                        <Col><Form.Control type="date" size="sm" value={filters.manufacturingDateFrom} onChange={(e) => setFilters({ ...filters, manufacturingDateFrom: e.target.value })} /></Col>
                        <Col><Form.Control type="date" size="sm" value={filters.manufacturingDateTo} onChange={(e) => setFilters({ ...filters, manufacturingDateTo: e.target.value })} /></Col>
                      </Row>
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small fw-semibold">Expiry Date Range</Form.Label>
                      <Row className="g-1">
                        <Col><Form.Control type="date" size="sm" value={filters.expiryDateFrom} onChange={(e) => setFilters({ ...filters, expiryDateFrom: e.target.value })} /></Col>
                        <Col><Form.Control type="date" size="sm" value={filters.expiryDateTo} onChange={(e) => setFilters({ ...filters, expiryDateTo: e.target.value })} /></Col>
                      </Row>
                    </Col>
                  </Row>
                  <div className="d-flex gap-2 mt-2">
                    <Form.Check type="checkbox" label="Show Low Stock Only" checked={filters.lowStockOnly} onChange={(e) => setFilters({ ...filters, lowStockOnly: e.target.checked })} />
                    <Button size="sm" variant="link" onClick={clearFilters} className="ms-auto">Clear All Filters</Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          <Row className="g-3">
            {filteredInventory.map(item => (
              <Col md={6} lg={4} xl={3} key={item.id}>
                <Card className="h-100 border-0 shadow-sm product-card">
                  <Card.Body>
                    <h6 className="fw-bold mb-1">{item.name}</h6>
                    <p className="text-muted small mb-2">SKU: {item.sku}</p>

                    <div className="small mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Stock:</span>
                        <strong>{item.quantity} {item.unit || 'packet'}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Price:</span>
                        <strong>₹{item.price}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>1 {item.unit || 'packet'}:</span>
                        <strong>₹{item.unitPrice || item.price}</strong>
                      </div>
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between">
                        <span>Supplier:</span>
                        <span className="text-truncate" style={{ maxWidth: '100px' }}>{item.supplierName || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Mfg:</span>
                        <span>{item.manufacturingDate || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Expiry:</span>
                        <span className={item.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-danger fw-bold' : ''}>
                          {item.expiryDate || 'N/A'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Invoice:</span>
                        <span>{item.invoiceNumber || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mb-2 text-center border-top pt-2">
                      <img src={`https://barcode.tec-it.com/barcode.ashx?data=${item.barcode || item.sku}&code=Code128&dpi=96`} alt="Barcode" style={{ maxWidth: '100%', height: '50px' }} />
                      <div className="small text-muted mt-1">{item.barcode || item.sku}</div>
                    </div>

                    {item.quantity <= item.lowStock ? (
                      <Badge bg="danger" className="w-100 mb-2">Low Stock</Badge>
                    ) : (
                      <Badge bg="success" className="w-100 mb-2">In Stock</Badge>
                    )}

                    <div className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={() => handleEdit(item)} className="flex-grow-1">
                        <Edit2 size={16} className="me-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {filteredInventory.length === 0 && (
            <Card className="border-0 shadow-sm text-center py-5">
              <Card.Body>
                <Package size={48} className="text-muted mb-3" />
                <h4>No products found</h4>
                <p className="text-muted">Try adjusting filters or add a new product</p>
                <Button onClick={handleAddProduct}>Add Product</Button>
              </Card.Body>
            </Card>
          )}

          <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{editingItem ? 'Edit' : 'Add'} Product to {categoryName}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Product Name</Form.Label>
                      <Form.Control
                        type="text"
                        list="product-suggestions"
                        value={formData.name}
                        placeholder="Start typing... suggestions will appear"
                        onChange={(e) => {
                          const selectedName = e.target.value
                          const existingProduct = inventory.find(p => p.name.toLowerCase() === selectedName.toLowerCase())

                          if (existingProduct && selectedName.length > 2) {
                            setFormData({
                              ...formData,
                              name: selectedName,
                              sku: editingItem ? formData.sku : generateSKU(),
                              quantity: '',
                              price: '',
                              unit: existingProduct.unit || 'packet',
                              unitPrice: existingProduct.unitPrice || existingProduct.price,
                              lowStock: existingProduct.lowStock,
                              image: existingProduct.image,
                              manufacturingDate: '',
                              expiryDate: '',
                              invoiceDate: '',
                              invoiceNumber: existingProduct.invoiceNumber || '',
                              supplierName: existingProduct.supplierName || ''
                            })
                          } else {
                            setFormData({
                              ...formData,
                              name: selectedName,
                              sku: selectedName && !editingItem ? generateSKU() : formData.sku,
                              invoiceNumber: '',
                              supplierName: ''
                            })
                          }
                        }}
                        required
                      />
                      <datalist id="product-suggestions">
                        {[...new Set(inventory.map(p => p.name))].map((name, i) => (
                          <option key={i} value={name} />
                        ))}
                      </datalist>
                      <Form.Text className="text-muted">
                        Type
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">SKU (Auto-changes)</Form.Label>
                      <Form.Control type="text" value={formData.sku} readOnly className="bg-light" />
                      <Form.Text className="text-muted">Auto-generated unique SKU</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Quantity</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => {
                          const qty = e.target.value
                          const unitPrice = parseFloat(formData.unitPrice) || 0
                          setFormData({
                            ...formData,
                            quantity: qty,
                            price: qty ? (unitPrice * parseFloat(qty)).toFixed(2) : ''
                          })
                        }}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Price per {formData.unit || 'unit'} ₹</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => {
                          const unitPrice = e.target.value
                          const qty = parseFloat(formData.quantity) || 0
                          setFormData({
                            ...formData,
                            unitPrice: unitPrice,
                            price: unitPrice ? (parseFloat(unitPrice) * qty).toFixed(2) : ''
                          })
                        }}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Total Price ₹ (Auto)</Form.Label>
                      <Form.Control type="number" step="0.01" value={formData.price} readOnly className="bg-light fw-bold" />
                      <Form.Text className="text-muted">
                        {formData.quantity || 0} × ₹{formData.unitPrice || 0}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Unit Type</Form.Label>
                      <Form.Select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                        <option value="packet">Packet</option>
                        <option value="box">Box</option>
                        <option value="kg">KG</option>
                        <option value="liter">Liter</option>
                        <option value="piece">Piece</option>
                        <option value="bottle">Bottle</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Low Stock Alert</Form.Label>
                      <Form.Control type="number" value={formData.lowStock} onChange={(e) => setFormData({ ...formData, lowStock: e.target.value })} required />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="small">Image URL</Form.Label>
                  <Form.Control type="url" placeholder="Optional" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
                </Form.Group>

                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Manufacturing Date</Form.Label>
                      <Form.Control type="date" value={formData.manufacturingDate} onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Expiry Date</Form.Label>
                      <Form.Control type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Invoice Date</Form.Label>
                      <Form.Control type="date" value={formData.invoiceDate} onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Invoice Number</Form.Label>
                      <Form.Control
                        type="text"
                        list="invoice-suggestions"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      />
                      <datalist id="invoice-suggestions">
                        {[...new Set(inventory.map(p => p.invoiceNumber).filter(Boolean))].map((num, i) => (
                          <option key={i} value={num} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Supplier Name</Form.Label>
                      <Form.Control
                        type="text"
                        list="supplier-suggestions"
                        value={formData.supplierName}
                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      />
                      <datalist id="supplier-suggestions">
                        {[...new Set(inventory.map(p => p.supplierName).filter(Boolean))].map((name, i) => (
                          <option key={i} value={name} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">{editingItem ? 'Update' : 'Add'} Product</Button>
              </Modal.Footer>
            </Form>
          </Modal>
        </Container>
      </div>
      <Footer />
    </>
  )
}

// Generate Barcode download - uses Code128 format
const downloadBarcode = (product) => {
  const barcodeData = product.barcode || product.sku
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=Code128&dpi=96&imagetype=Png`
  
  // Create download link
  const link = document.createElement('a')
  link.href = barcodeUrl
  link.download = `${product.sku}-barcode.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
// SALES HISTORY PAGE
function SalesHistoryPage() {
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const salesRef = ref(db, 'sales')
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => b.timestamp - a.timestamp)
        setSales(items)
      } else {
        setSales([])
      }
    })
    return () => unsubscribe()
  }, [])

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(search.toLowerCase())

    if (dateFilter === 'today') {
      const today = new Date().toDateString()
      return matchesSearch && new Date(sale.date).toDateString() === today
    }
    if (dateFilter === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      return matchesSearch && sale.timestamp > weekAgo
    }
    return matchesSearch
  })

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0)
  const totalSales = filteredSales.length

  const viewInvoice = (sale) => {
    setSelectedInvoice(sale)
    setShowInvoiceModal(true)
  }

  const printInvoice = () => {
    window.print()
  }

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100 py-4">
        <Container>
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
            <h1 className="fw-bold mb-0">Sales History</h1>
            <Button variant="primary" onClick={() => navigate('/checkout')}>
              <CreditCard size={18} className="me-1" /> New Billing
            </Button>
          </div>

          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Total Sales</p>
                  <h3 className="fw-bold mb-0">{totalSales}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Total Revenue</p>
                  <h3 className="fw-bold text-success mb-0">₹{totalRevenue.toLocaleString()}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <p className="text-muted small mb-1">Avg Sale Value</p>
                  <h3 className="fw-bold mb-0">₹{totalSales > 0 ? (totalRevenue / totalSales).toFixed(0) : 0}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="g-2 mb-3">
                <Col md>
                  <Form.Control
                    type="text"
                    placeholder="Search by invoice or customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Col>
                <Col md="auto">
                  <Form.Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                  </Form.Select>
                </Col>
              </Row>

              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        <ShoppingBag size={40} className="mb-2" />
                        <div>No sales found</div>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id}>
                        <td className="fw-semibold">{sale.invoiceNumber}</td>
                        <td className="small">{new Date(sale.date).toLocaleDateString()}</td>
                        <td>{sale.customerName}</td>
                        <td>{sale.items.length}</td>
                        <td className="fw-bold">₹{sale.total.toFixed(2)}</td>
                        <td><Badge bg="info" className="text-uppercase">{sale.paymentMode}</Badge></td>
                        <td>
                          <Button size="sm" variant="outline-primary" onClick={() => viewInvoice(sale)}>
                            <FileText size={14} className="me-1" /> Invoice
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Container>
      </div>

      {/* Invoice Modal with Print */}
      <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} centered size="lg">
        <Modal.Header closeButton className="d-print-none">
          <Modal.Title>Tax Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body id="invoice-print">
          {selectedInvoice && (
            <div className="p-3">
              <div className="text-center mb-4">
                <h2 className="fw-bold">StockFlow</h2>
                <p className="text-muted small mb-0">Inventory Management System</p>
                <hr />
                <h4 className="fw-bold">TAX INVOICE</h4>
              </div>

              <Row className="mb-3 small">
                <Col>
                  <strong>Invoice No:</strong> {selectedInvoice.invoiceNumber}<br />
                  <strong>Date:</strong> {new Date(selectedInvoice.date).toLocaleString()}
                </Col>
                <Col className="text-end">
                  <strong>Customer:</strong> {selectedInvoice.customerName}<br />
                  <strong>Phone:</strong> {selectedInvoice.customerPhone || 'N/A'}
                </Col>
              </Row>

              <Table bordered size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.name}<br /><small className="text-muted">{item.sku}</small></td>
                      <td>{item.qty}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Row>
                <Col md={6}>
                  <div className="text-center border p-2">
                    <img
                      src={`https://barcode.tec-it.com/barcode.ashx?data=${selectedInvoice.invoiceNumber}&code=Code128&dpi=96`}
                      alt="Invoice Barcode"
                      style={{ maxWidth: '200px', height: '60px' }}
                    />
                    <div className="small text-muted">{selectedInvoice.invoiceNumber}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <Table borderless size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Subtotal:</td>
                        <td className="text-end">₹{selectedInvoice.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Discount:</td>
                        <td className="text-end">-₹{selectedInvoice.discount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>GST ({selectedInvoice.gstPercent}%):</td>
                        <td className="text-end">₹{selectedInvoice.gst.toFixed(2)}</td>
                      </tr>
                      <tr className="fw-bold h5">
                        <td>Total:</td>
                        <td className="text-end">₹{selectedInvoice.total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Payment:</td>
                        <td className="text-end text-uppercase">{selectedInvoice.paymentMode}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>

              <div className="text-center mt-4 small text-muted">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-print-none">
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Close</Button>
          <Button variant="primary" onClick={printInvoice}>
            <FileText size={16} className="me-1" /> Print Invoice
          </Button>
        </Modal.Footer>
      </Modal>
      <Footer />
    </>
  )
}
// DAILY REPORT PAGE
function DailyReportPage() {
  const [sales, setSales] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [inventory, setInventory] = useState([])

  useEffect(() => {
    const salesRef = ref(db, 'sales')
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setSales(items)
      } else {
        setSales([])
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const inventoryRef = ref(db, 'inventory')
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        setInventory(items)
      }
    })
    return () => unsubscribe()
  }, [])

  // Filter sales for selected date
  const dailySales = sales.filter(sale => {
    const saleDate = new Date(sale.date).toISOString().split('T')[0]
    return saleDate === selectedDate
  })

  // Calculate metrics
  const totalRevenue = dailySales.reduce((sum, s) => sum + s.total, 0)
  const totalTransactions = dailySales.length
  const totalItemsSold = dailySales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.qty, 0), 0)
  const avgSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Payment mode breakdown
  const paymentBreakdown = dailySales.reduce((acc, sale) => {
    acc[sale.paymentMode] = (acc[sale.paymentMode] || 0) + sale.total
    return acc
  }, {})

  // Top selling products
  const productSales = {}
  dailySales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSales[item.sku]) {
        productSales[item.sku] = { name: item.name, qty: 0, revenue: 0 }
      }
      productSales[item.sku].qty += item.qty
      productSales[item.sku].revenue += item.total
    })
  })
  const topProducts = Object.entries(productSales)
    .map(([sku, data]) => ({ sku, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // Hourly sales chart
  const hourlyData = Array(24).fill(0)
  dailySales.forEach(sale => {
    const hour = new Date(sale.date).getHours()
    hourlyData[hour] += sale.total
  })

  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Revenue ₹',
        data: hourlyData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Hourly Sales for ${new Date(selectedDate).toLocaleDateString('en-IN')}`,
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }

  const downloadDailyReport = () => {
    const headers = ['Invoice', 'Time', 'Customer', 'Items', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment']
    const rows = dailySales.map(sale => [
      sale.invoiceNumber,
      new Date(sale.date).toLocaleTimeString('en-IN'),
      sale.customerName,
      sale.items.length,
      sale.subtotal.toFixed(2),
      sale.discount.toFixed(2),
      sale.gst.toFixed(2),
      sale.total.toFixed(2),
      sale.paymentMode
    ])

    const summary = [
      [''],
      ['DAILY SUMMARY'],
      ['Date', selectedDate],
      ['Total Revenue', `₹${totalRevenue.toFixed(2)}`],
      ['Total Transactions', totalTransactions],
      ['Items Sold', totalItemsSold],
      ['Average Sale', `₹${avgSaleValue.toFixed(2)}`]
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summary.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Daily_Report_${selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100 py-4">
        <Container>
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
            <h1 className="fw-bold mb-0">Daily Report</h1>
            <div className="d-flex gap-2">
              <InputGroup style={{ width: '200px' }}>
                <InputGroup.Text><Calendar size={16} /></InputGroup.Text>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </InputGroup>
              <Button variant="success" onClick={downloadDailyReport} disabled={dailySales.length === 0}>
                <Download size={18} className="me-1" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <Row className="g-3 mb-4">
            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Total Revenue</p>
                      <h3 className="fw-bold mb-0 text-success">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    </div>
                    <DollarSign size={32} className="text-success opacity-25" />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Transactions</p>
                      <h3 className="fw-bold mb-0">{totalTransactions}</h3>
                    </div>
                    <ShoppingBag size={32} className="text-primary opacity-25" />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Items Sold</p>
                      <h3 className="fw-bold mb-0">{totalItemsSold}</h3>
                    </div>
                    <Package size={32} className="text-info opacity-25" />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Avg Sale Value</p>
                      <h3 className="fw-bold mb-0">₹{avgSaleValue.toFixed(0)}</h3>
                    </div>
                    <TrendingUp size={32} className="text-warning opacity-25" />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Hourly Chart */}
          <Row className="g-3 mb-4">
            <Col lg={8}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Payment Breakdown */}
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Payment Breakdown</h6>
                  {Object.keys(paymentBreakdown).length > 0 ? (
                    Object.entries(paymentBreakdown).map(([mode, amount]) => (
                      <div key={mode} className="d-flex justify-content-between mb-2">
                        <span className="text-capitalize">{mode}:</span>
                        <strong>₹{amount.toFixed(2)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted small">No sales yet</p>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span>₹{totalRevenue.toFixed(2)}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Top Products & Transactions */}
          <Row className="g-3">
            <Col lg={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Top Selling Products</h6>
                  {topProducts.length > 0 ? (
                    <Table hover size="sm">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty Sold</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={p.sku}>
                            <td>
                              <div className="fw-semibold small">{p.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.sku}</div>
                            </td>
                            <td><Badge bg="primary">{p.qty}</Badge></td>
                            <td className="fw-bold">₹{p.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted small">No sales for this date</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Today's Transactions</h6>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {dailySales.length > 0 ? (
                      <Table hover size="sm">
                        <thead className="sticky-top bg-white">
                          <tr>
                            <th>Time</th>
                            <th>Invoice</th>
                            <th>Customer</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailySales.map(sale => (
                            <tr key={sale.id}>
                              <td className="small">{new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="small fw-semibold">{sale.invoiceNumber}</td>
                              <td className="small">{sale.customerName}</td>
                              <td className="fw-bold">₹{sale.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-muted small">No transactions for this date</p>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <Footer />
    </>
  )
}
export default App
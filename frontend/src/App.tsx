import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRoute";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { AnimatePresence, motion } from "framer-motion";
import Preloader from "./components/Preloader";
import Footer from "./components/Footer";
import CustomerAIAssistantWidget from "./components/CustomerAIAssistantWidget";
import FoodReels from "./pages/FoodReels";

const App = () => {
  const {user, loading, showPreloader, setShowPreloader} = useAppData();

  if (loading) {
    return (
      <h1 className="text-2xl font-bold text-red-500 text-center mt-56">
        Loading...
      </h1>
    );
  }

  if(user && user.role === "seller") {
    return (
      <>
        <AnimatePresence>
          {showPreloader && (
            <motion.div
              key="preloader"
              initial={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 1, ease: [0.785, 0.135, 0.15, 0.86] }}
              className="fixed inset-0 z-[9999]"
            >
              <Preloader onComplete={() => setShowPreloader(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        <Restaurant />
      </>
    );
  }

  if(user && user.role === "rider") {
    return (
      <>
        <AnimatePresence>
          {showPreloader && (
            <motion.div
              key="preloader"
              initial={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 1, ease: [0.785, 0.135, 0.15, 0.86] }}
              className="fixed inset-0 z-[9999]"
            >
              <Preloader onComplete={() => setShowPreloader(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        <RiderDashboard />
      </>
    );
  }

  if(user && user.role === "admin") {
    return (
      <>
        <AnimatePresence>
          {showPreloader && (
            <motion.div
              key="preloader"
              initial={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 1, ease: [0.785, 0.135, 0.15, 0.86] }}
              className="fixed inset-0 z-[9999]"
            >
              <Preloader onComplete={() => setShowPreloader(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        <AdminDashboard />
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showPreloader && (
          <motion.div
            key="preloader"
            initial={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 1, ease: [0.785, 0.135, 0.15, 0.86] }}
            className="fixed inset-0 z-[9999]"
          >
            <Preloader onComplete={() => setShowPreloader(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />

          <Route path="/paymentsuccess/:paymentId" element={<PaymentSuccess />} />

          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/ordersuccess" element={<OrderSuccess />} />

          <Route path="/address" element={<AddAddressPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/reels" element={<FoodReels />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/account" element={<Account />} />
          </Route>
        </Routes>
        <CustomerAIAssistantWidget />
        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App;
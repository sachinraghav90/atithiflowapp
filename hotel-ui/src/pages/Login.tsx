import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import LoginFormCard from "@/components/login/LoginFormCard";

const Login = () => {
  return (
    <>
      <Helmet>
        <title>Log in | AtithiFlow</title>
        <meta
          name="description"
          content="Access your AtithiFlow account to manage hotel operations, reservations, and guest experiences."
        />
        <link rel="canonical" href="https://atithiflow.com/login" />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-64px)] lg:min-h-screen lg:grid lg:grid-cols-2 bg-white">
        {/* Left Column - Brand Panel (Desktop only) */}
        <LoginBrandPanel />

        {/* Right Column - Login Form */}
        <LoginFormCard />
      </main>
    </>
  );
};

export default Login;

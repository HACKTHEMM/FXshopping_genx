import Login from './components/Login';

export default function LoginPage() {
  const handleLogin = () => {
    // Handle successful login - redirect to dashboard
    window.location.href = '/';
  };

  return <Login onLogin={handleLogin} />;
}

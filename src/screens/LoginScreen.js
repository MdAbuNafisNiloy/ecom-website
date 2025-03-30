import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Button, 
  TextField, 
  Typography, 
  IconButton, 
  InputAdornment, 
  Paper, 
  CircularProgress,
  Alert,
  Box,
  Modal,
  Container,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Mail as MailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import pb from '../pocketbase';
import { useCart } from '../contexts/CartContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isResetEmailSending, setIsResetEmailSending] = useState(false);
  const [resetEmailSuccess, setResetEmailSuccess] = useState(false);
  const [appInfo, setAppInfo] = useState();
  const [logo, setLogo] = useState(); 
  const { updateCart } = useCart();
  const navigate = useNavigate();
  
  // For responsive design
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const appInfo = await pb.collection('appinfo').getFirstListItem();
        setAppInfo(appInfo);
        setLogo(appInfo.logo);
      } catch (error) {
        console.error('Error fetching app info:', error);
      }
    };
    fetchAppInfo();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Authenticate with PocketBase
      const user = await pb.collection('users').authWithPassword(email, password);

      const authToken = pb.authStore.token;
      // json encode user object
      const userJson = JSON.stringify(user);

      // Use localStorage instead of SecureStore for web
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', userJson);
      localStorage.setItem('userId', user.record.id);
      localStorage.setItem('loginType', 'user');

      const cart = user.record.cart;
      if(cart){
        updateCart(cart);
      }
      console.log('cart', cart);  
      
      // Navigate to Home screen or Dashboard after successful login
      // navigate('/profile');
      window.location.href = '/profile';
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      alert('Please enter your email address');
      return;
    }

    try {
      setIsResetEmailSending(true);
      
      // Send password reset email using PocketBase
      await pb.collection('users').requestPasswordReset(forgotPasswordEmail);
      
      setResetEmailSuccess(true);
      setTimeout(() => {
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail('');
        setResetEmailSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      alert('Failed to send reset email. Please check if the email is registered.');
    } finally {
      setIsResetEmailSending(false);
    }
  };

  const openForgotPasswordModal = () => {
    setShowForgotPasswordModal(true);
    setForgotPasswordEmail('');
    setResetEmailSuccess(false);
  };

  return (
    <PageContainer>
      <Header>
        {/* <BackButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </BackButton> */}
      </Header>
      
      <ContentWrapper>
        <LogoContainer>
          {logo ? (
            <Logo 
              src={pb.files.getURL(appInfo, logo)} 
              alt="App logo" 
              onError={(e) => {
                console.error('Error loading logo');
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <LogoPlaceholder>
              <Typography variant="h4">Friends Online Shop</Typography>
            </LogoPlaceholder>
          )}
        </LogoContainer>
        
        <FormContainer maxWidth={isLargeScreen ? "sm" : false}>
          <WelcomeText variant="h4">Welcome back!</WelcomeText>
          <SubtitleText variant="body1">Sign in to continue shopping</SubtitleText>
          
          {error && (
            <ErrorAlert severity="error">
              {error}
            </ErrorAlert>
          )}
          
          <TextField
            fullWidth
            placeholder="Email Address"
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            placeholder="Password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <ForgotPasswordButton onClick={openForgotPasswordModal}>
            Forgot Password?
          </ForgotPasswordButton>
          
          <LoginButton 
            variant="contained" 
            fullWidth 
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </LoginButton>
          
          <OrContainer>
            <Divider sx={{ flex: 1 }} />
            <OrText>OR</OrText>
            <Divider sx={{ flex: 1 }} />
          </OrContainer>
          
          <SignupContainer>
            <Typography variant="body2" color="textSecondary">
              Don't have an account?{' '}
            </Typography>
            <SignupLink onClick={() => navigate('/signup')}>
              Sign Up
            </SignupLink>
          </SignupContainer>
          
          {/* Seller Options */}
          <SellerOptionsContainer>
            <SellerDivider>
              <SellerDividerLine />
              <SellerDividerText>Seller Options</SellerDividerText>
              <SellerDividerLine />
            </SellerDivider>
            
            <SellerOptionsWrapper>
              <SellerOptionLink 
                href='https://seller.friendsonlineshop.com/' 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <SellerOptionIcon>
                  <FontAwesomeIcon icon={faArrowRightFromBracket} />
                </SellerOptionIcon>
                <SellerOptionText>Login as Seller</SellerOptionText>
              </SellerOptionLink>
              
              <SellerOptionLink 
                href='https://seller.friendsonlineshop.com/register' 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <SellerOptionIcon>
                  <FontAwesomeIcon icon={faCheckCircle} />
                </SellerOptionIcon>
                <SellerOptionText>Register as Seller</SellerOptionText>
              </SellerOptionLink>
            </SellerOptionsWrapper>
          </SellerOptionsContainer>
        </FormContainer>
      </ContentWrapper>

      {/* Forgot Password Modal */}
      <Modal
        open={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="h6">Reset Password</Typography>
            <IconButton onClick={() => setShowForgotPasswordModal(false)}>
              <CloseIcon />
            </IconButton>
          </ModalHeader>

          {resetEmailSuccess ? (
            <SuccessContainer>
              <CheckCircleIcon color="success" sx={{ fontSize: 50 }} />
              <Typography variant="body1" color="success.main" sx={{ mt: 2, textAlign: 'center' }}>
                Password reset email sent! Check your inbox.
              </Typography>
            </SuccessContainer>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Enter your email address and we'll send you instructions to reset your password.
              </Typography>
              
              <TextField
                fullWidth
                placeholder="Email Address"
                variant="outlined"
                margin="normal"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                type="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <ResetButton 
                variant="contained" 
                fullWidth 
                onClick={handleForgotPassword}
                disabled={isResetEmailSending}
              >
                {isResetEmailSending ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </ResetButton>
            </>
          )}
        </ModalContent>
      </Modal>
    </PageContainer>
  );
};

// Styled components using @emotion/styled
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #fff;
  padding: 0 20px 40px;
  max-width: 100%;
  overflow-x: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding-top: 16px;
  padding-bottom: 8px;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  
  @media (min-width: 960px) {
    max-width: 1200px;
    margin: 0 auto;
  }
`;

const BackButton = styled(IconButton)`
  padding: 8px;
`;

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 40px;
`;

const LogoPlaceholder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  margin-bottom: 20px;
  color: #007bff;
`;

const Logo = styled.img`
  width: 120px;
  height: 100px;
  object-fit: contain;
  
  @media (min-width: 960px) {
    width: 150px;
    height: 130px;
  }
`;

const FormContainer = styled(Container)`
  width: 100%;
  max-width: 400px;
  
  @media (min-width: 960px) {
    max-width: 450px;
    padding: 30px;
    background-color: #f8f9fa;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const WelcomeText = styled(Typography)`
  font-weight: 700;
  color: #212529;
  margin-bottom: 8px;
  text-align: center;
  
  @media (min-width: 960px) {
    font-size: 2.4rem;
  }
`;

const SubtitleText = styled(Typography)`
  color: #6c757d;
  margin-bottom: 32px;
  text-align: center;
  
  @media (min-width: 960px) {
    font-size: 1.1rem;
  }
`;

const ErrorAlert = styled(Alert)`
  margin-bottom: 16px;
`;

const ForgotPasswordButton = styled(Button)`
  align-self: flex-end;
  margin-bottom: 24px;
  color: #007bff;
  padding: 0;
  text-transform: none;
  font-size: 14px;
  display: block;
  margin-left: auto;
  margin-top: 4px;
  
  &:hover {
    background-color: transparent;
    color: #0056b3;
    text-decoration: underline;
  }
`;

const LoginButton = styled(Button)`
  background-color: #007bff;
  height: 50px;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 24px;
  &:hover {
    background-color: #0069d9;
  }
  
  @media (min-width: 960px) {
    height: 56px;
    font-size: 1.1rem;
  }
`;

const OrContainer = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
`;

const OrText = styled(Typography)`
  color: #6c757d;
  margin: 0 16px;
  font-size: 14px;
`;

const SignupContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
`;

const SignupLink = styled(Button)`
  color: #007bff;
  font-weight: 600;
  padding: 0;
  font-size: 14px;
  text-transform: none;
  min-width: auto;
  
  &:hover {
    background-color: transparent;
    color: #0056b3;
    text-decoration: underline;
  }
`;

const SellerOptionsContainer = styled(Box)`
  width: 100%;
  margin-top: 16px;
`;

const SellerDivider = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
`;

const SellerDividerLine = styled(Box)`
  flex: 1;
  height: 1px;
  background-color: #dee2e6;
`;

const SellerDividerText = styled(Typography)`
  color: #6c757d;
  margin: 0 16px;
  font-size: 14px;
  white-space: nowrap;
`;

const SellerOptionsWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const SellerOptionLink = styled.a`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e9ecef;
    border-color: #ced4da;
    transform: translateY(-2px);
  }
  
  @media (min-width: 960px) {
    padding: 14px 20px;
  }
`;

const SellerOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  color: #007bff;
  
  @media (min-width: 960px) {
    width: 28px;
    height: 28px;
    font-size: 18px;
  }
`;

const SellerOptionText = styled(Typography)`
  font-weight: 500;
  
  @media (min-width: 960px) {
    font-size: 1.05rem;
  }
`;

const ModalContent = styled(Paper)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border-radius: 12px;
  outline: none;
  
  @media (min-width: 960px) {
    max-width: 450px;
    padding: 24px;
  }
`;

const ModalHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ResetButton = styled(Button)`
  background-color: #007bff;
  height: 50px;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 8px;
  &:hover {
    background-color: #0069d9;
  }
  
  @media (min-width: 960px) {
    height: 56px;
  }
`;

const SuccessContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

export default LoginScreen;
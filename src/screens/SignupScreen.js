import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Container, 
  Paper, 
  Grid, 
  IconButton, 
  InputAdornment, 
  Alert, 
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  Building, 
  Home, 
  MapPin, 
  ChevronDown, 
  AlertCircle,
  X as XIcon 
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import pb from '../pocketbase';

// List of countries for dropdown
const COUNTRIES = [
  'Bangladesh',
  // Add more countries as needed
];

const SignupScreen = () => {
  const navigate = useNavigate();
  const [appInfo, setAppInfo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  // Fix the useEffect with async/await pattern
  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        setLogoLoading(true);
        const record = await pb.collection('appinfo').getFirstListItem('');
        if (record) {
          setAppInfo(record);
        }
      } catch (err) {
        console.error('App info fetch error:', err);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchAppInfo();
  }, []);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    city: '',
    street: '',
    village: '',
    country: '',
    postalCode: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    // Confirm password validation
    if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match';
    }
    
    // Name validation
    if (!formData.name) {
      errors.name = 'Full name is required';
    }
    
    // Phone validation (optional but validate format if provided)
    if (formData.phone && !/^\+?\d{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Enter a valid phone number';
    }
    
    // Country validation
    if (!formData.country) {
      errors.country = 'Country is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create the user in PocketBase
      const userData = {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        street: formData.street,
        village: formData.village,
        country: formData.country,
        postalCode: formData.postalCode,
      };
      
      // Create user account
      const createdUser = await pb.collection('users').create(userData);
      
      // Show success alert with enqueueSnackbar (or you can use MUI Alert)
      // We'll use a simple alert for now
      alert("Your account has been created successfully. Please login with your credentials.");
      navigate('/login');
      
    } catch (err) {
      console.error('Signup error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred during signup. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Safely get the logo URL
  const getLogoUrl = () => {
    if (!appInfo || !appInfo.logo) return null;
    try {
      return pb.files.getUrl(appInfo, appInfo.logo);
    } catch (error) {
      console.error('Error getting logo URL:', error);
      return null;
    }
  };

  return (
    <PageContainer>
      
      
      <ContentWrapper>
        <LogoContainer>
          {logoLoading ? (
            <CircularProgress size={40} /> 
          ) : (
            appInfo && appInfo.logo ? (
              <LogoImage 
                src={getLogoUrl()} 
                alt="Logo" 
                onError={(e) => {
                  console.error('Logo loading error');
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <LogoPlaceholder>
                <Typography variant="h4" color="primary">
                  {appInfo?.appName || 'Create Account'}
                </Typography>
              </LogoPlaceholder>
            )
          )}
        </LogoContainer>
        
        <FormContainer maxWidth={isLargeScreen ? "md" : false} elevation={isLargeScreen ? 3 : 0}>
          <FormHeader>
            <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
              Create Account
            </Typography>
            
            <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 4 }}>
              Create your account to start shopping
            </Typography>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                icon={<AlertCircle size={20} />}
              >
                {error}
              </Alert>
            )}
          </FormHeader>
          
          <FormContent>
            {/* Basic Information */}
            <FormSection>
              <SectionTitle variant="h6" gutterBottom>
                Account Information
              </SectionTitle>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Email Address"
                  placeholder="Enter your email address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateFormField('password', e.target.value)}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <EyeOff size={20} color="#6c757d" /> : <Eye size={20} color="#6c757d" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.passwordConfirm}
                  onChange={(e) => updateFormField('passwordConfirm', e.target.value)}
                  error={!!formErrors.passwordConfirm}
                  helperText={formErrors.passwordConfirm}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <EyeOff size={20} color="#6c757d" /> : <Eye size={20} color="#6c757d" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
            </FormSection>
            
            {/* Address Information */}
            <FormSection>
              <SectionTitle variant="h6" gutterBottom>
                Shipping Address
              </SectionTitle>
              
              <FormFieldsGrid>
                <FormField className="grid-item">
                  <FormControl fullWidth error={!!formErrors.country}>
                    <InputLabel id="country-select-label">Select Country</InputLabel>
                    <Select
                      labelId="country-select-label"
                      value={formData.country}
                      onChange={(e) => updateFormField('country', e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <Globe size={20} color="#6c757d" />
                        </InputAdornment>
                      }
                      label="Select Country"
                    >
                      {COUNTRIES.map((country, index) => (
                        <MenuItem key={index} value={country}>
                          {country}
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.country && <FormHelperText>{formErrors.country}</FormHelperText>}
                  </FormControl>
                </FormField>
                
                <FormField className="grid-item">
                  <TextField
                    fullWidth
                    label="District"
                    placeholder="Enter your district"
                    value={formData.city}
                    onChange={(e) => updateFormField('city', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Building size={20} color="#6c757d" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
                
                <FormField className="grid-item">
                  <TextField
                    fullWidth
                    label="Upazila/Thana"
                    placeholder="Enter your upazila/thana"
                    value={formData.village}
                    onChange={(e) => updateFormField('village', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Home size={20} color="#6c757d" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
                
                <FormField className="grid-item">
                  <TextField
                    fullWidth
                    label="Postal/ZIP Code"
                    placeholder="Enter your postal/ZIP code"
                    value={formData.postalCode}
                    onChange={(e) => updateFormField('postalCode', e.target.value)}
                    type="number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Mail size={20} color="#6c757d" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </FormFieldsGrid>
              
              <FormField>
                <TextField
                  fullWidth
                  label="Full Address"
                  placeholder="Enter your full address"
                  value={formData.street}
                  onChange={(e) => updateFormField('street', e.target.value)}
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MapPin size={20} color="#6c757d" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
            </FormSection>
          </FormContent>
          
          <FormActions>
            <SignupButton
              fullWidth
              variant="contained"
              onClick={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : "Create Account"}
            </SignupButton>
            
            <LoginContainer>
              <Typography variant="body2" color="textSecondary">
                Already have an account?{" "}
              </Typography>
              <LoginLink onClick={() => navigate('/login')}>
                Sign In
              </LoginLink>
            </LoginContainer>

            {/* Seller Options */}
            <SellerOptionsContainer>
              <SellerDivider>
                <SellerDividerLine />
                <SellerDividerText>Seller Options</SellerDividerText>
                <SellerDividerLine />
              </SellerDivider>
              
              <SellerOptionsWrapper>
                <SellerOptionLink 
                  href='https://seller.goodmartbd.com/' 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <SellerOptionIcon>
                    <FontAwesomeIcon icon={faArrowRightFromBracket} />
                  </SellerOptionIcon>
                  <SellerOptionText>Login as Seller</SellerOptionText>
                </SellerOptionLink>
                
                <SellerOptionLink 
                  href='https://seller.goodmartbd.com/register' 
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
          </FormActions>
        </FormContainer>
      </ContentWrapper>
    </PageContainer>
  );
};

// Styled components
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

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 30px;
  height: 120px;
`;

const LogoPlaceholder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: #007bff;
`;

const LogoImage = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  
  @media (min-width: 960px) {
    width: 150px;
    height: 150px;
  }
`;

const FormContainer = styled(Container)`
  width: 100%;
  padding: 24px;
  border-radius: 8px;
  
  @media (min-width: 960px) {
    background-color: #f8f9fa;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 32px;
  }
`;

const FormHeader = styled.div`
  margin-bottom: 24px;
  
  @media (min-width: 960px) {
    max-width: 80%;
    margin: 0 auto 30px;
  }
`;

const FormContent = styled.div`
  @media (min-width: 960px) {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }
`;

const FormSection = styled(Box)`
  margin-bottom: 24px;
  
  @media (min-width: 960px) {
    flex: 1 1 45%;
    min-width: 280px;
  }
`;

const FormFieldsGrid = styled.div`
  @media (min-width: 960px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    
    .grid-item {
      margin-bottom: 8px;
    }
  }
`;

const SectionTitle = styled(Typography)`
  font-weight: 600;
  color: #212529;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 8px;
  margin-bottom: 16px;
  
  @media (min-width: 960px) {
    font-size: 1.25rem;
  }
`;

const FormField = styled(Box)`
  margin-bottom: 16px;
`;

const FormActions = styled.div`
  margin-top: 24px;
  
  @media (min-width: 960px) {
    max-width: 70%;
    margin: 32px auto 0;
  }
`;

const SignupButton = styled(Button)`
  background-color: #007bff;
  padding: 12px;
  border-radius: 5px;
  text-transform: none;
  font-size: 16px;
  font-weight: 600;
  height: 48px;
  
  &:hover {
    background-color: #0069d9;
  }
  
  @media (min-width: 960px) {
    height: 56px;
    font-size: 1.1rem;
  }
`;

const LoginContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  margin-bottom: 24px;
`;

const LoginLink = styled(Typography)`
  display: inline;
  color: #007bff;
  font-weight: 600;
  margin-left: 4px;
  cursor: pointer;
  
  &:hover {
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
  
  @media (min-width: 960px) {
    flex-direction: row;
  }
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
    flex: 1;
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

export default SignupScreen;
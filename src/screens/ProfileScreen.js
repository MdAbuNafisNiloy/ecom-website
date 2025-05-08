import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  Paper, 
  Box, 
  Grid, 
  Container, 
  Switch, 
  CircularProgress, 
  Divider,
  InputAdornment,
  Modal,
  Alert
} from '@mui/material';
import { 
  Person as PersonIcon,
  EditOutlined as EditIcon,
  LockOutlined as LockIcon,
  PhoneOutlined as PhoneIcon,
  HomeOutlined as HomeIcon,
  LocationOnOutlined as LocationIcon,
  PublicOutlined as GlobalIcon,
  MailOutlineRounded as MailIcon,
  ShoppingBagOutlined as BagIcon,
  FavoriteBorderOutlined as HeartIcon,
  HelpOutline as HelpIcon,
  LogoutOutlined as LogoutIcon,
  ArrowForwardIos as ChevronForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  BusinessOutlined as BusinessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HeadsetMic as HeadsetIcon
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import pb from '../pocketbase';

const ProfileScreen = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [supportUrl, setSupportUrl] = useState(null);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    street: '',
    village: '',
    country: '',
    postalCode: '',
  });
  
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    promotions: false,
  });

  const { updateLocalCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSupportUrl = async () => {
      try {
        const supportUrlObj = await pb.collection('social_links').getFullList();
        
        const messengerLink = supportUrlObj.find(link => link.name === 'messenger');
        if (messengerLink) {
          setSupportUrl(messengerLink.url);
        }
      } catch (error) {
        console.error('Error fetching support URL:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupportUrl();
  }, []);

  // Memoized function to check auth state
  const checkAuthState = useCallback(async () => {
    setIsLoading(true);

    try {
      // For web, we use localStorage instead of SecureStore
      const userId = localStorage.getItem('userId');

      if (userId) {
        setUserId(userId);
        // Fetch user details from PocketBase using the userId
        const user = await pb.collection('users').getOne(userId);

        if (user) {
          // Update auth token and user data in localStorage
          const authToken = pb.authStore.token;
          localStorage.setItem('authToken', authToken);
          localStorage.setItem('user', JSON.stringify(user));

          // Restore the PocketBase authentication state
          pb.authStore.save(authToken, user);
          setIsAuthenticated(true);
          setUserData(user);

          setVerified(user.verified);

          // Only initialize form data if it's empty or when not in edit mode
          if (!editMode || Object.values(formData).every(val => val === '')) {
            setFormData({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              city: user.city || '',
              street: user.street || '',
              village: user.village || '',
              country: user.country || '',
              postalCode: user.postalCode || '',
            });
          }
        } else {
          // If user data is not found, clear storage and auth state
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          pb.authStore.clear();
          setIsAuthenticated(false);
          setUserData(null);
        }
      } else {
        // No userId found, user is not authenticated
        setIsAuthenticated(false);
        setUserData(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
      setUserData(null);

      // Clear invalid or expired token and user data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      updateLocalCart({}); // Clear the cart
      pb.authStore.clear();
    } finally {
      setIsLoading(false);
    }
  }, [editMode, formData]);

  // Initial check for auth state - runs only once
  useEffect(() => {
    checkAuthState();
  }, []);

  // Separate effect for auth store changes - prevents infinite loop
  // We removed the checkAuthState dependency to prevent form resets
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      if (!isLoading && !editMode) {  // Don't refresh while editing
        checkAuthState();
      }
    });

    return () => {
      unsubscribe(); // Unsubscribe from the authStore onChange listener
    };
  }, [isLoading, editMode]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      pb.authStore.clear();
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.setItem('loginType', 'guest');
      setIsAuthenticated(false);
      setUserData(null);
      updateLocalCart({}); // Clear the cart
        navigate('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to log out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Cancel editing - reset form data to current user data
      setFormData({
        name: userData?.name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        city: userData?.city || '',
        street: userData?.street || '',
        village: userData?.village || '',
        country: userData?.country || '',
        postalCode: userData?.postalCode || '',
      });
    }
    setEditMode(!editMode);
  };

  const updateFormField = (field, value) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [field]: value
    }));
  };

  const saveProfile = async () => {
    try {
      setUpdateLoading(true);
      console.log('formData', formData);

      const userid = userId;
      
      // Only update fields that have changed
      const updateData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== userData[key]) {
          updateData[key] = formData[key];
        }
      });
      
      // Skip if no changes
      if (Object.keys(updateData).length === 0) {
        setEditMode(false);
        setUpdateLoading(false);
        return;
      }
      
      // Update user record
      const updatedUser = await pb.collection('users').update(userid, updateData);
      
      // Update local user data and localStorage
      setUserData(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      alert('Your profile has been updated successfully.');
      setEditMode(false);
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      await pb.collection('users').requestVerification(userData.email);
      alert('Verification email has been sent.');
    } catch (error) {
      console.error('Resend verification email error:', error);
      alert('Failed to resend verification email. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }

    try {
      // Update password using PocketBase
      await pb.collection('users').update(pb.authStore.model.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });

      alert('Password changed successfully.');
      setChangePasswordModalVisible(false); // Close the modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please try again.');
    }
  };

  const renderAuthenticatedContent = () => {
    return (
      <ScrollContainer>
        {!verified && (
          <VerifyContainer>
            <MailIcon sx={{ fontSize: 32, color: '#5e72e4' }} />
            <Typography sx={{ mt: 1, mb: 1, textAlign: 'center', color: '#32325d' }}>
              Verify your email to unlock all features
            </Typography>
            <ResendButton 
              variant="contained" 
              onClick={resendVerificationEmail}
            >
              Resend Verification
            </ResendButton>
          </VerifyContainer>
        )}

        <ProfileCard>
          <ProfileHeader>
            <ProfileImageContainer>
              <ProfileImage>
                <ProfileInitial>
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                </ProfileInitial>
              </ProfileImage>
              {!editMode && (
                <EditProfileButton onClick={toggleEditMode}>
                  <EditIcon fontSize="small" />
                </EditProfileButton>
              )}
            </ProfileImageContainer>
            
            {!editMode ? (
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5, color: '#32325d' }}>
                {userData?.name || 'User'}
              </Typography>
            ) : (
              <EditNameContainer>
                <TextField
                  fullWidth
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="Full Name"
                  variant="standard"
                  InputProps={{
                    sx: { 
                      fontSize: '1.25rem', 
                      fontWeight: 600, 
                      textAlign: 'center',
                      '&::before': {
                        borderBottomColor: '#5e72e4'
                      }
                    }
                  }}
                />
              </EditNameContainer>
            )}
            
            {!editMode && (
              <Typography variant="body2" sx={{ color: '#8898aa', mb: 1 }}>
                {userData?.email}
              </Typography>
            )}

            {verified && !editMode && (
              <VerifiedBadge>
                <CheckCircleIcon sx={{ fontSize: 14, color: '#fff', mr: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                  Verified
                </Typography>
              </VerifiedBadge>
            )}
          </ProfileHeader>
        </ProfileCard>
        
        {editMode ? (
          <SectionCard>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#32325d' }}>
              Edit Profile
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Phone Number"
              variant="outlined"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormField('phone', e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon sx={{ color: '#8898aa' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  placeholder="Country"
                  variant="outlined"
                  value={formData.country}
                  onChange={(e) => updateFormField('country', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <GlobalIcon sx={{ color: '#8898aa' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  placeholder="District"
                  variant="outlined"
                  value={formData.city}
                  onChange={(e) => updateFormField('city', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: '#8898aa' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              placeholder="Upazila/Thana"
              variant="outlined"
              value={formData.village}
              onChange={(e) => updateFormField('village', e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HomeIcon sx={{ color: '#8898aa' }} />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              placeholder="Full Address"
              variant="outlined"
              value={formData.street}
              onChange={(e) => updateFormField('street', e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationIcon sx={{ color: '#8898aa' }} />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              placeholder="Postal/ZIP Code"
              variant="outlined"
              type="number"
              value={formData.postalCode}
              onChange={(e) => updateFormField('postalCode', e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailIcon sx={{ color: '#8898aa' }} />
                  </InputAdornment>
                ),
              }}
            />
            
            <ButtonRow>
              <CancelButton 
                variant="outlined"
                onClick={toggleEditMode}
              >
                Cancel
              </CancelButton>
              
              <SaveButton 
                variant="contained"
                onClick={saveProfile}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Save Changes'
                )}
              </SaveButton>
            </ButtonRow>
          </SectionCard>
        ) : (
          <>
            <SectionCard>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#32325d' }}>
                Account Details
              </Typography>
              
              <DetailRow>
                <DetailIconContainer>
                  <PhoneIcon sx={{ color: '#5e72e4' }} />
                </DetailIconContainer>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8898aa', mb: 0.5 }}>
                    Phone
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#32325d', fontWeight: 500 }}>
                    {userData?.phone || 'Not provided'}
                  </Typography>
                </Box>
              </DetailRow>
              
              <DetailRow>
                <DetailIconContainer>
                  <LocationIcon sx={{ color: '#5e72e4' }} />
                </DetailIconContainer>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8898aa', mb: 0.5 }}>
                    Address
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#32325d', fontWeight: 500 }}>
                    {[
                      userData?.street,
                      userData?.village,
                      userData?.city,
                      userData?.country,
                      userData?.postalCode
                    ].filter(Boolean).join(', ') || 'Not provided'}
                  </Typography>
                </Box>
              </DetailRow>
            </SectionCard>
          
            <SectionCard>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#32325d' }}>
                Orders & Shopping
              </Typography>
              
              <MenuItem onClick={() => navigate('/my-orders')}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(94, 114, 228, 0.1)' }}>
                  <BagIcon sx={{ color: '#5e72e4' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  My Orders
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
              
              <MenuItem onClick={() => navigate('/wishlist')}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(251, 99, 64, 0.1)' }}>
                  <HeartIcon sx={{ color: '#fb6340' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  Wishlist
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
            </SectionCard>

            <SectionCard>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#32325d' }}>
                Account
              </Typography>
              
              <MenuItem onClick={() => setChangePasswordModalVisible(true)}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(255, 214, 0, 0.1)' }}>
                  <LockIcon sx={{ color: '#ffd600' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  Change Password
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
              
              <MenuItem onClick={() => window.open(supportUrl, '_blank')}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(17, 205, 239, 0.1)' }}>
                  <HelpIcon sx={{ color: '#11cdef' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  Help Center
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
              
              <MenuItem onClick={() => navigate('/support')}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(45, 206, 137, 0.1)' }}>
                  <HeadsetIcon sx={{ color: '#2dce89' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  Support Chat
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
              
              <MenuItem onClick={handleLogout}>
                <MenuIconContainer sx={{ bgcolor: 'rgba(245, 54, 92, 0.1)' }}>
                  <LogoutIcon sx={{ color: '#f5365c' }} />
                </MenuIconContainer>
                <Typography variant="body1" sx={{ flex: 1, color: '#32325d', fontWeight: 500 }}>
                  Log Out
                </Typography>
                <ChevronForwardIcon sx={{ color: '#8898aa' }} />
              </MenuItem>
            </SectionCard>
          </>
        )}
      </ScrollContainer>
    );
  };

  const renderUnauthenticatedContent = () => {
    return (
      <UnauthenticatedContainer>
        <PersonIcon sx={{ fontSize: 100, color: '#5e72e4', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#32325d', mb: 1 }}>
          Welcome!
        </Typography>
        <Typography variant="body1" sx={{ color: '#8898aa', mb: 3, textAlign: 'center' }}>
          Sign in to access your profile and orders
        </Typography>
        
        <LoginButton 
          variant="contained"
          fullWidth
          onClick={() => navigate('/login')}
        >
          Log In
        </LoginButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#8898aa' }}>
            Don't have an account?
          </Typography>
          <SignupLink onClick={() => navigate('/signup')}>
            Sign Up
          </SignupLink>
        </Box>
      </UnauthenticatedContainer>
    );
  };

  return (
    <PageContainer>
      {isLoading ? (
        <LoadingContainer>
          <CircularProgress size={40} sx={{ color: '#5e72e4' }} />
        </LoadingContainer>
      ) : isAuthenticated ? (
        renderAuthenticatedContent()
      ) : (
        renderUnauthenticatedContent()
      )}

      {/* Change Password Modal */}
      <Modal
        open={isChangePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Change Password</Typography>
            <IconButton onClick={() => setChangePasswordModalVisible(false)}>
              <CloseIcon />
            </IconButton>
          </ModalHeader>

          <TextField
            fullWidth
            placeholder="Current Password"
            variant="outlined"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            placeholder="New Password"
            variant="outlined"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            placeholder="Confirm New Password"
            variant="outlined"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <ModalButtonsContainer>
            <CancelModalButton
              variant="outlined"
              onClick={() => setChangePasswordModalVisible(false)}
            >
              Cancel
            </CancelModalButton>

            <SaveModalButton
              variant="contained"
              onClick={handleChangePassword}
            >
              Save
            </SaveModalButton>
          </ModalButtonsContainer>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
};

// Styled components (unchanged)
const PageContainer = styled.div`
  background-color: #f7fafc;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const ScrollContainer = styled.div`
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const ProfileCard = styled(Paper)`
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 16px;
`;

const SectionCard = styled(Paper)`
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 16px;
`;

const ProfileHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ProfileImageContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const ProfileImage = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: #c8d6e5;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 8px rgba(94, 114, 228, 0.2);
`;

const ProfileInitial = styled.span`
  font-size: 40px;
  font-weight: bold;
  color: #fff;
`;

const EditProfileButton = styled(IconButton)`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: #5e72e4;
  color: white;
  width: 36px;
  height: 36px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background-color: #4a5cba;
  }
`;

const EditNameContainer = styled.div`
  width: 100%;
  margin-bottom: 12px;
  text-align: center;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const DetailIconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(94, 114, 228, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f7fafc;
  cursor: pointer;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.01);
  }
`;

const MenuIconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
`;

const CancelButton = styled(Button)`
  flex: 1;
  margin-right: 8px;
  color: #32325d;
  border-color: #e9ecef;
  
  &:hover {
    background-color: #f8f9fa;
    border-color: #dee2e6;
  }
`;

const SaveButton = styled(Button)`
  flex: 1;
  margin-left: 8px;
  background-color: #5e72e4;
  
  &:hover {
    background-color: #4a5cba;
  }
`;

const VerifyContainer = styled(Paper)`
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ResendButton = styled(Button)`
  background-color: #5e72e4;
  margin-top: 12px;
  padding: 8px 16px;
  
  &:hover {
    background-color: #4a5cba;
  }
`;

const VerifiedBadge = styled.div`
  display: flex;
  align-items: center;
  background-color: #2dce89;
  padding: 4px 12px;
  border-radius: 16px;
  margin-top: 8px;
`;

const UnauthenticatedContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #fff;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
`;

const LoginButton = styled(Button)`
  background-color: #5e72e4;
  padding: 12px 0;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 8px rgba(94, 114, 228, 0.2);
  
  &:hover {
    background-color: #4a5cba;
  }
`;

const SignupLink = styled(Button)`
  color: #5e72e4;
  font-weight: 600;
  padding: 0;
  padding-left: 4px;
  min-width: auto;
  text-transform: none;
  
  &:hover {
    background-color: transparent;
    text-decoration: underline;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f7fafc;
`;

const ModalContent = styled(Paper)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  padding: 24px;
  border-radius: 12px;
  outline: none;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
`;

const CancelModalButton = styled(Button)`
  flex: 1;
  margin-right: 8px;
  color: #32325d;
  border-color: #e9ecef;
`;

const SaveModalButton = styled(Button)`
  flex: 1;
  margin-left: 8px;
  background-color: #5e72e4;
  
  &:hover {
    background-color: #4a5cba;
  }
`;

export default ProfileScreen;
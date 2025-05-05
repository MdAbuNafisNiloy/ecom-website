import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Fade
} from '@mui/material';
import {
  Menu as MenuIcon,
  ArrowForward as ArrowForwardIcon,
  PhoneInTalk as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import pb from '../pocketbase';

const ProductsScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // State management
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Fetch services from PocketBase
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        // Assuming 'services' is the collection name in PocketBase
        const serviceRecords = await pb.collection('products').getList(1, 2, {
          sort: '-created',
        });
        
        setServices(serviceRecords.items);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, []);
  
  // Toggle menu drawer
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Service Card Component
  const ServiceCard = ({ service }) => {
    const {
      id,
      title,
      description,
      image,
      price
    } = service;
    
    // Get image or fallback to placeholder
    const getImageSrc = () => {
      if (!image) return 'https://via.placeholder.com/600x400?text=Alpha+Soft+Service';
      return pb.files.getUrl(service, image);
    };
    
    return (
      <Card 
        elevation={2}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
          }
        }}
      >
        <CardMedia
          component="img"
          height={200}
          image={getImageSrc()}
          alt={title}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography 
            variant="h5" 
            component="h2"
            sx={{ 
              mb: 1, 
              fontWeight: 600,
              color: theme.palette.primary.main
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              fontWeight: 500
            }}
          >
            {price && `Starting at $${price}`}
          </Typography>
          <Typography variant="body1">
            {description}
          </Typography>
        </CardContent>
        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/service/${id}`)}
            sx={{ 
              borderRadius: 2,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            Learn More
          </Button>
        </CardActions>
      </Card>
    );
  };
  
  // Service loading skeleton
  const ServiceSkeleton = () => (
    <Paper 
      elevation={1}
      sx={{ 
        height: '100%', 
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'rgba(0,0,0,0.04)'
      }}
    >
      <Box sx={{ height: 200, bgcolor: 'rgba(0,0,0,0.08)' }} />
      <Box sx={{ p: 3 }}>
        <Box sx={{ height: 32, width: '70%', mb: 1, bgcolor: 'rgba(0,0,0,0.08)' }} />
        <Box sx={{ height: 24, width: '40%', mb: 2, bgcolor: 'rgba(0,0,0,0.08)' }} />
        <Box sx={{ height: 20, width: '100%', mb: 1, bgcolor: 'rgba(0,0,0,0.08)' }} />
        <Box sx={{ height: 20, width: '90%', mb: 1, bgcolor: 'rgba(0,0,0,0.08)' }} />
        <Box sx={{ height: 20, width: '95%', mb: 2, bgcolor: 'rgba(0,0,0,0.08)' }} />
        <Box sx={{ height: 48, width: '100%', bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 2 }} />
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with sticky navigation */}
      <AppBar 
        position="sticky" 
        color="default"
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexGrow: 1,
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/')}
            >
              <Typography 
                variant="h5" 
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  '& span': {
                    color: theme.palette.secondary.main
                  }
                }}
              >
                Alpha<span>Soft</span>
              </Typography>
            </Box>
            
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button color="inherit" onClick={() => navigate('/services')}>
                  Services
                </Button>
                <Button color="inherit" onClick={() => navigate('/about')}>
                  About
                </Button>
                <Button color="inherit" onClick={() => navigate('/contact')}>
                  Contact
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<CartIcon />}
                  onClick={() => navigate('/store')}
                  sx={{ 
                    ml: 1,
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Shop Now
                </Button>
              </Box>
            )}
            
            {isMobile && (
              <IconButton 
                edge="end" 
                color="inherit" 
                aria-label="menu"
                onClick={toggleMenu}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile menu drawer */}
      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={toggleMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: '80%',
            maxWidth: 300,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              mb: 2, 
              pb: 2, 
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontWeight: 700,
              color: theme.palette.primary.main
            }}
          >
            Alpha<span style={{ color: theme.palette.secondary.main }}>Soft</span>
          </Typography>
          <List>
            <ListItem button onClick={() => { navigate('/services'); toggleMenu(); }}>
              <ListItemText primary="Services" />
            </ListItem>
            <ListItem button onClick={() => { navigate('/about'); toggleMenu(); }}>
              <ListItemText primary="About" />
            </ListItem>
            <ListItem button onClick={() => { navigate('/contact'); toggleMenu(); }}>
              <ListItemText primary="Contact" />
            </ListItem>
          </List>
          <Divider sx={{ my: 2 }} />
          <Button 
            variant="contained" 
            color="primary"
            fullWidth
            startIcon={<CartIcon />}
            onClick={() => { navigate('/store'); toggleMenu(); }}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              py: 1.5
            }}
          >
            Shop Now
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Contact Us:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                mb: 0.5,
                color: 'text.secondary',
                '& svg': {
                  mr: 1,
                  fontSize: '1rem',
                  color: theme.palette.primary.main
                }
              }}
            >
              <PhoneIcon /> +1 (555) 123-4567
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                '& svg': {
                  mr: 1,
                  fontSize: '1rem',
                  color: theme.palette.primary.main
                }
              }}
            >
              <EmailIcon /> info@alphasoft.com
            </Typography>
          </Box>
        </Box>
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* Services Section - Coming first as per requirement */}
        <Box 
          sx={{ 
            py: { xs: 4, md: 6 },
            px: { xs: 2, sm: 3 },
            bgcolor: 'background.default'
          }}
        >
          <Container maxWidth="lg">
            <Box 
              sx={{ 
                mb: 4, 
                textAlign: 'center',
                maxWidth: 800,
                mx: 'auto'
              }}
            >
              <Typography 
                variant="h4" 
                component="h2"
                sx={{ 
                  mb: 2,
                  fontWeight: 700,
                  color: theme.palette.text.primary
                }}
              >
                Our Premium Services
              </Typography>
              <Typography 
                variant="subtitle1" 
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Discover how Alpha Soft can transform your digital experience with our top-rated services
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {loading ? (
                // Service loading skeletons
                Array(2).fill(0).map((_, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <ServiceSkeleton />
                  </Grid>
                ))
              ) : services.length > 0 ? (
                // Actual service cards
                services.map(service => (
                  <Grid item xs={12} sm={6} key={service.id}>
                    <ServiceCard service={service} />
                  </Grid>
                ))
              ) : (
                // Fallback when no services are available
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Services Coming Soon
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      We're preparing amazing services for you. Check back soon!
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button 
                variant="outlined" 
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/services')}
                sx={{ 
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '1rem'
                }}
              >
                View All Services
              </Button>
            </Box>
          </Container>
        </Box>
        
        {/* Hero Banner Section */}
        <Box
          sx={{
            py: { xs: 6, md: 10 },
            position: 'relative',
            bgcolor: theme.palette.primary.main,
            color: 'white',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Background Pattern */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              background: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
            }}
          />
          
          <Container maxWidth="md">
            <Fade in={true} timeout={1000}>
              <Box>
                <Typography 
                  variant="h3" 
                  component="h1"
                  sx={{ 
                    mb: 3,
                    fontWeight: 800,
                    textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    fontSize: { xs: '2.5rem', md: '3.5rem' }
                  }}
                >
                  Transform Your Digital Experience
                </Typography>
                
                <Typography 
                  variant="h6"
                  sx={{ 
                    mb: 4,
                    maxWidth: 700,
                    mx: 'auto',
                    opacity: 0.9,
                    lineHeight: 1.6
                  }}
                >
                  Powerful eCommerce solutions built for speed and conversions
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="secondary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/store')}
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    }
                  }}
                >
                  Start Shopping
                </Button>
              </Box>
            </Fade>
          </Container>
        </Box>

        {/* About Section */}
        <Box 
          sx={{ 
            py: { xs: 5, md: 8 },
            bgcolor: 'background.paper'
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box 
                  sx={{
                    p: { xs: 2, md: 4 }
                  }}
                >
                  <Typography 
                    variant="h4" 
                    component="h2"
                    sx={{ 
                      mb: 3,
                      fontWeight: 700,
                      color: theme.palette.text.primary
                    }}
                  >
                    About Alpha Soft
                  </Typography>
                  
                  <Typography 
                    variant="body1"
                    sx={{ 
                      mb: 3,
                      color: 'text.secondary',
                      lineHeight: 1.7
                    }}
                  >
                    Alpha Soft is a premier eCommerce solutions provider dedicated to creating exceptional 
                    digital experiences. With a focus on performance and user experience, we build
                    platforms that help businesses scale and succeed.
                  </Typography>
                  
                  <Typography 
                    variant="body1"
                    sx={{ 
                      mb: 4,
                      color: 'text.secondary',
                      lineHeight: 1.7
                    }}
                  >
                    Our team of experts combines technical excellence with creative design to deliver
                    solutions that not only look great but perform exceptionally well on all devices.
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/about')}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.2,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Learn More About Us
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box 
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: { xs: 2, md: 4 }
                  }}
                >
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Team working at Alpha Soft"
                    sx={{
                      width: '100%',
                      maxWidth: 500,
                      height: 'auto',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
        
        {/* How It Works Section */}
        <Box 
          sx={{ 
            py: { xs: 5, md: 8 },
            bgcolor: 'background.default'
          }}
        >
          <Container maxWidth="lg">
            <Box 
              sx={{ 
                mb: 5, 
                textAlign: 'center',
                maxWidth: 700,
                mx: 'auto'
              }}
            >
              <Typography 
                variant="h4" 
                component="h2"
                sx={{ 
                  mb: 2,
                  fontWeight: 700,
                  color: theme.palette.text.primary
                }}
              >
                How It Works
              </Typography>
              <Typography 
                variant="subtitle1" 
                color="text.secondary"
              >
                Get started with Alpha Soft in three simple steps
              </Typography>
            </Box>
            
            <Grid container spacing={4} justifyContent="center">
              {[
                {
                  step: 1,
                  title: 'Choose Your Service',
                  description: 'Browse our selection of premium eCommerce services and select the one that fits your needs.',
                  icon: '🔍'
                },
                {
                  step: 2,
                  title: 'Customize Your Solution',
                  description: 'Work with our team to customize the service to match your specific requirements and brand.',
                  icon: '⚙️'
                },
                {
                  step: 3,
                  title: 'Launch & Grow',
                  description: 'Go live with your new solution and start growing your online business with our ongoing support.',
                  icon: '🚀'
                }
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.step}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.08)'
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        fontSize: '1.5rem',
                        mb: 3,
                        mx: 'auto'
                      }}
                    >
                      <Typography variant="h5" component="span">
                        {item.icon}
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      component="h3"
                      sx={{ 
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      {item.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {item.description}
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        display: 'inline-block',
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: 36,
                        height: 36,
                        lineHeight: '36px',
                        fontWeight: 'bold',
                        mt: 2
                      }}
                    >
                      {item.step}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
      
      {/* Footer */}
      <Box 
        component="footer"
        sx={{ 
          py: 4,
          mt: 'auto',
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography 
                variant="h6" 
                component="h3"
                sx={{ 
                  mb: 2,
                  fontWeight: 700,
                  color: theme.palette.primary.main
                }}
              >
                Alpha<span style={{ color: theme.palette.secondary.main }}>Soft</span>
              </Typography>
              <Typography 
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Providing premium eCommerce solutions with a focus on performance, design, and user experience.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(social => (
                  <Box
                    key={social}
                    component="a"
                    href={`https://${social}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: 'white',
                      }
                    }}
                  >
                    <Box 
                      component="img"
                      src={`https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/${social}.svg`}
                      alt={social}
                      sx={{ width: 16, height: 16, filter: 'invert(0.5)' }}
                    />
                  </Box>
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography 
                variant="h6" 
                component="h3"
                sx={{ 
                  mb: 2,
                  fontWeight: 600,
                }}
              >
                Quick Links
              </Typography>
              <Box component="nav">
                <Box 
                  component="ul"
                  sx={{ 
                    listStyle: 'none',
                    p: 0,
                    m: 0,
                    '& li': {
                      mb: 1
                    },
                    '& a': {
                      color: 'text.secondary',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      }
                    }
                  }}
                >
                  <li><a href="/services">Services</a></li>
                  <li><a href="/about">About Us</a></li>
                  <li><a href="/contact">Contact</a></li>
                  <li><a href="/blog">Blog</a></li>
                  <li><a href="/privacy">Privacy Policy</a></li>
                  <li><a href="/terms">Terms of Service</a></li>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography 
                variant="h6" 
                component="h3"
                sx={{ 
                  mb: 2,
                  fontWeight: 600,
                }}
              >
                Contact Us
              </Typography>
              <Box 
                sx={{ 
                  '& > div': {
                    display: 'flex',
                    mb: 2,
                    alignItems: 'flex-start',
                    '& svg': {
                      color: 'primary.main',
                      mr: 2,
                      mt: 0.5
                    }
                  }
                }}
              >
                <Box>
                  <LocationIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    123 Commerce St., Suite 500<br />
                    San Francisco, CA 94103
                  </Typography>
                </Box>
                
                <Box>
                  <PhoneIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    +1 (555) 123-4567
                  </Typography>
                </Box>
                
                <Box>
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    info@alphasoft.com
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
          
          <Box 
            sx={{ 
              mt: 4, 
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Alpha Soft. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ProductsScreen;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Button, 
  CircularProgress, 
  Container, 
  Paper,
  useMediaQuery,
  IconButton,
  Divider
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon, 
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import pb from '../pocketbase';

const ShopScreen = () => {
  const { id } = useParams();
    const sellerId = id || 'seller1'; // Default seller ID for testing
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:960px)');
  
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch seller details and products
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch seller details
        const sellerData = await pb.collection('sellers').getOne(sellerId);
        setSeller(sellerData);

        // Fetch published products by this seller
        const productRecords = await pb.collection('products').getList(1, 50, {
          filter: `shop = "${sellerId}" && status = "published"`,
          sort: '-created',
        });
        setProducts(productRecords.items);
      } catch (err) {
        console.error('Error fetching shop data:', err);
        setError('Failed to load shop data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopData();
  }, [sellerId]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <CircularProgress size={48} color="primary" />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackIcon />}
        >
          Go Back
        </Button>
      </ErrorContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      {/* Back button for mobile */}
      {!isDesktop && (
        <BackButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </BackButton>
      )}
      
      {/* Banner image */}
      <BannerContainer>
        {seller?.shop_banner ? (
          <BannerImage 
            src={pb.files.getUrl(seller, seller.shop_banner)} 
            alt={seller.shop_name}
          />
        ) : (
          <DefaultBanner />
        )}
      </BannerContainer>
      
      <ContentContainer>
        {/* Shop info section */}
        <ShopInfoSection elevation={3}>
          <ShopInfoInner isDesktop={isDesktop}>
            {/* Shop logo */}
            <LogoContainer>
              {seller?.shop_logo ? (
                <ShopLogo 
                  src={pb.files.getUrl(seller, seller.shop_logo)} 
                  alt={seller.shop_name}
                />
              ) : (
                <DefaultLogo>{seller?.shop_name?.charAt(0) || 'S'}</DefaultLogo>
              )}
            </LogoContainer>
            
            <ShopInfoContent>
              <Typography variant={isDesktop ? "h4" : "h5"} fontWeight="bold" gutterBottom>
                {seller?.shop_name}
              </Typography>
              
              {seller?.admin_verified && (
                <VerifiedBadge>
                  <CheckCircleIcon sx={{ color: '#155724', fontSize: 18, mr: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#155724' }}>
                    Verified Seller
                  </Typography>
                </VerifiedBadge>
              )}
              
              <Typography variant="body1" color="text.secondary" sx={{ my: 2 }}>
                {seller?.shop_description}
              </Typography>
              
              {seller?.social && (
                <MessageButton
                  variant="contained"
                  color="primary"
                  startIcon={<ChatIcon />}
                  onClick={() => window.open(seller.social, '_blank')}
                >
                  Send Message
                </MessageButton>
              )}
            </ShopInfoContent>
          </ShopInfoInner>
        </ShopInfoSection>
        
        {/* Products section */}
        <ProductsSection>
          <SectionTitle variant="h5" fontWeight="bold">
            Products
          </SectionTitle>
          
          <Divider sx={{ mb: 3 }} />
          
          {products.length > 0 ? (
            <ProductsGrid container spacing={3}>
              {products.map(product => {
                const imageUrl = product.images && product.images.length > 0
                  ? pb.files.getURL(product, product.images[0])
                  : 'https://via.placeholder.com/300';
                
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
                    <ProductCard 
                      onClick={() => navigate(`/product/${product.slug}`, { state: { product } })}
                    >
                      <ProductImage 
                        src={imageUrl} 
                        alt={product.title}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300';
                        }}
                      />
                      <ProductContent>
                        <Typography variant="subtitle1" fontWeight={600} noWrap gutterBottom>
                          {product.title}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          ৳{parseFloat(product.price).toFixed(2)}
                        </Typography>
                      </ProductContent>
                    </ProductCard>
                  </Grid>
                );
              })}
            </ProductsGrid>
          ) : (
            <EmptyProductsContainer>
              <Typography variant="h6" color="text.secondary">
                No products available.
              </Typography>
            </EmptyProductsContainer>
          )}
        </ProductsSection>
      </ContentContainer>
    </PageContainer>
  );
};

// Styled components
const PageContainer = styled(Container)`
  position: relative;
  padding: 0;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const BannerContainer = styled.div`
  width: 100%;
  height: 200px;
  overflow: hidden;
  position: relative;
  
  @media (min-width: 960px) {
    height: 300px;
  }
`;

const BannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultBanner = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
`;

const ContentContainer = styled.div`
  margin-top: -80px;
  position: relative;
  z-index: 10;
  
  @media (min-width: 960px) {
    margin-top: -100px;
  }
`;

const ShopInfoSection = styled(Paper)`
  margin: 0 16px;
  border-radius: 12px;
  overflow: hidden;
  
  @media (min-width: 960px) {
    margin: 0 auto;
    max-width: 1200px;
  }
`;

const ShopInfoInner = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: ${props => props.isDesktop ? 'row' : 'column'};
  align-items: ${props => props.isDesktop ? 'flex-start' : 'center'};
  text-align: ${props => props.isDesktop ? 'left' : 'center'};
`;

const LogoContainer = styled.div`
  margin-bottom: 16px;
  
  @media (min-width: 960px) {
    margin-right: 32px;
    margin-bottom: 0;
  }
`;

const ShopLogo = styled.img`
  width: 140px;
  height: 140px;
  border-radius: 70px;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  @media (min-width: 960px) {
    width: 180px;
    height: 180px;
    border-radius: 90px;
  }
`;

const DefaultLogo = styled.div`
  width: 140px;
  height: 140px;
  border-radius: 70px;
  background-color: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  font-weight: bold;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  @media (min-width: 960px) {
    width: 180px;
    height: 180px;
    border-radius: 90px;
    font-size: 80px;
  }
`;

const ShopInfoContent = styled.div`
  flex: 1;
`;

const VerifiedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: #d4edda;
  padding: 6px 12px;
  border-radius: 20px;
`;

const MessageButton = styled(Button)`
  margin-top: 16px;
  background-color: #007bff;
  &:hover {
    background-color: #0069d9;
  }
`;

const ProductsSection = styled.section`
  margin: 32px 16px;
  
  @media (min-width: 960px) {
    margin: 32px auto;
    max-width: 1200px;
  }
`;

const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
`;

const ProductsGrid = styled(Grid)`
  margin-top: 16px;
`;

const ProductCard = styled(Card)`
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
`;

const ProductImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
`;

const ProductContent = styled(CardContent)`
  flex-grow: 1;
`;

const EmptyProductsContainer = styled.div`
  padding: 64px 0;
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  text-align: center;
  padding: 24px;
`;

const BackButton = styled(IconButton)`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.8);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }
`;

export default ShopScreen;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  CircularProgress, 
  Button, 
  Typography, 
  IconButton,
  useMediaQuery,
  useTheme,
  Container,
  Box
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import pb from '../pocketbase';

// Responsive Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  min-height: 100vh;
  padding: 16px;
  
  @media (min-width: 600px) {
    padding: 24px;
  }
  
  @media (min-width: 960px) {
    padding: 32px;
  }
`;

const CategoriesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const CategoryCard = styled.div`
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
  }
`;

const CategoryImageContainer = styled.div`
  position: relative;
  padding-top: 65%; /* 16:9 aspect ratio */
  width: 100%;
  overflow: hidden;
`;

const CategoryImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  
  .category-card:hover & {
    transform: scale(1.05);
  }
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: #ff3b30;
  color: #fff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1;
`;

const CategoryContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #fff;
  flex-grow: 1;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const RefreshButton = styled(Button)`
  margin-left: auto;
  
  @media (max-width: 480px) {
    align-self: flex-end;
  }
`;

const CenteredContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  text-align: center;
  padding: 24px;
`;

const LoadingContainer = styled(CenteredContainer)``;

const EmptyContainer = styled(CenteredContainer)`
  color: #6c757d;
`;

// Mock API call to simulate fetching categories
const fetchCategories = async () => {
  const categoryRecords = await pb.collection('categories').getFullList();
  return categoryRecords;
};

// Maximum number of retries
const MAX_RETRIES = 5;
// Initial delay in milliseconds
const INITIAL_RETRY_DELAY = 1000;

const CategoriesScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);

  // Memoize the loadCategories function to prevent unnecessary recreations
  const loadCategories = useCallback(async (isRetry = false, retryAttempt = 0) => {
    try {
      if (!isRefreshing && !hasLoadedSuccessfully) {
        setIsLoading(true);
      }

      if (isRetry) {
        setRetryMessage(`Retrying... (Attempt ${retryAttempt}/${MAX_RETRIES})`);
      } else {
        setRetryMessage('');
      }

      const data = await fetchCategories();
      
      // Only update if there's actual data
      if (data && data.length > 0) {
        setAllCategories(data);
        setRetryCount(0); // Reset retry count on success
        setRetryMessage('');
        setHasLoadedSuccessfully(true); // Mark that we've successfully loaded data
      } else if (!hasLoadedSuccessfully) {
        // If no data and we haven't successfully loaded before, consider as failure and retry
        throw new Error("No categories found");
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      
      // Only retry if we haven't successfully loaded data yet
      if (!hasLoadedSuccessfully) {
        // If we haven't reached max retries, try again after a delay
        if (retryAttempt < MAX_RETRIES) {
          const nextRetryAttempt = retryAttempt + 1;
          setRetryCount(nextRetryAttempt);
          
          // Exponential backoff: delay increases with each retry
          const retryDelay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryAttempt);
          
          setTimeout(() => {
            loadCategories(true, nextRetryAttempt);
          }, retryDelay);
        } else {
          // After max retries, just show that we're still trying but less frequently
          setRetryMessage('Still trying to connect...');
          
          // Continue trying but at a longer interval
          setTimeout(() => {
            loadCategories(true, 0); // Restart retry count
          }, INITIAL_RETRY_DELAY * 5);
        }
      }
    } finally {
      // Always finish loading if:
      // 1. We've successfully loaded data before
      // 2. This is not a retry attempt OR we've reached max retries
      if (hasLoadedSuccessfully || !isRetry || retryAttempt >= MAX_RETRIES) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [hasLoadedSuccessfully, isRefreshing]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRetryCount(0);
    loadCategories(false, 0);
  };

  const navigateToCategory = (category) => {
    // Navigate to the category products screen
    navigate('/category/' + category.id, { 
      state: { 
        categoryId: category.id,
        categoryName: category.name 
      }
    });
  };

  // Loading state - only if we haven't loaded successfully
  if (isLoading && !isRefreshing && !hasLoadedSuccessfully) {
    return (
      <LoadingContainer maxWidth="sm">
        <CircularProgress color="primary" size={60} thickness={4} />
        <Typography variant="body1" color="textSecondary" sx={{ mt: 3, fontWeight: 500 }}>
          Loading categories...
        </Typography>
        {retryMessage && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {retryMessage}
          </Typography>
        )}
      </LoadingContainer>
    );
  }

  // Empty state - only show after we've exhausted retries
  if (allCategories.length === 0) {
    return (
      <EmptyContainer maxWidth="sm">
        <FolderOpenOutlinedIcon sx={{ fontSize: 80, mb: 3, color: '#6c757d' }} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          No categories found
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, color: '#6c757d' }}>
          {retryCount > 0 
            ? "We're still trying to load categories in the background..." 
            : "We couldn't find any categories at the moment."}
        </Typography>
        <Button 
          variant="outlined" 
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ borderRadius: '8px', textTransform: 'none' }}
        >
          Refresh Now
        </Button>
      </EmptyContainer>
    );
  }

  // Main content (if categories exist)
  return (
    <PageContainer>
      <HeaderContainer>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            mb: isMobile ? 1 : 0,
            color: '#1a1a1a'
          }}
        >
          Categories
        </Typography>
        <RefreshButton
          variant="text"
          color="primary"
          disabled={isRefreshing}
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ textTransform: 'none' }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </HeaderContainer>
      
      {isRefreshing && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress size={24} thickness={4} />
        </Box>
      )}
      
      <CategoriesGrid>
        {allCategories.map((category) => (
          <CategoryCard 
            key={category.id}
            onClick={() => navigateToCategory(category)}
            className="category-card"
          >
            <CategoryImageContainer>
              <CategoryImage 
                src={pb.files.getURL(category, category.image)}
                alt={category.name}
                loading="lazy"
              />
              {category.featured && (
                <FeaturedBadge>Featured</FeaturedBadge>
              )}
            </CategoryImageContainer>
            
            <CategoryContent>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '14px', sm: '16px' },
                  color: '#333'
                }}
              >
                {category.name}
              </Typography>
              <IconButton 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)'
                  }
                }}
              >
                <ChevronRightIcon color="primary" />
              </IconButton>
            </CategoryContent>
          </CategoryCard>
        ))}
      </CategoriesGrid>
    </PageContainer>
  );
};

export default CategoriesScreen;
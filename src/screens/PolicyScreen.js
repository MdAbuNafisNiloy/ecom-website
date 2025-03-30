import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import parse from 'html-react-parser';
import pb from '../pocketbase'; // Pocketbase configuration

const PolicyScreen = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get title from URL params or localStorage
  const [title, setTitle] = useState('');
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch title from localStorage or URL params
  useEffect(() => {
    const fetchTitle = () => {
      try {
        const storedTitle = localStorage.getItem('policyTitle');
        
        if (location.state && location.state.title) {
          setTitle(location.state.title);
        } else if (storedTitle && storedTitle !== "Policy") {
          setTitle(storedTitle);
        } else if (params.title) {
          setTitle(params.title);
        }
      } catch (err) {
        console.error('Error fetching title:', err);
        setError('Error fetching title.');
      }
    };

    fetchTitle();
  }, [location, params]);

  // Update document title
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  // Fetch policy by title
  useEffect(() => {
    if (!title) return;
    
    setLoading(true);

    const fetchPolicy = async () => {
      try {
        // Search for the policy with the matching title
        let records = await pb.collection('policies').getFullList();
        let record = records.find((item) => item.title === title);
        setPolicy(record);
      } catch (err) {
        console.error('Error fetching policy:', err);
        setError('Policy not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [title]);

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} color="primary" />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <ErrorMessage variant="h5" color="error" align="center">
          {error}
        </ErrorMessage>
      </Container>
    );
  }

  // Directly use html-react-parser without custom replacement
  // This preserves all HTML attributes and content exactly as it is
  const content = policy?.details ? parse(policy.details) : null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <MuiLink color="inherit" href="#" onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}>
          Home
        </MuiLink>
        <Typography color="text.primary">{title}</Typography>
      </Breadcrumbs>

      <PolicyContainer elevation={2}>
        <PolicyContent>
          {content}
        </PolicyContent>
      </PolicyContainer>
    </Container>
  );
};

// Styled components
const LoadingContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const PolicyContainer = styled(Paper)`
  padding: 24px;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PolicyContent = styled(Box)`
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  
  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    color: #212529;
    margin-bottom: 16px;
  }
  
  h1 { font-size: 24px; }
  h2 { font-size: 22px; }
  h3 { font-size: 20px; }
  
  p {
    font-size: 16px;
    line-height: 1.5;
    color: #495057;
    margin-bottom: 16px;
  }
  
  a {
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;
  }
  
  img {
    max-width: 100%;
    height: auto;
    margin: 16px 0;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }
  
  th, td {
    border: 1px solid #dee2e6;
    padding: 8px;
  }
  
  ul, ol {
    margin-bottom: 16px;
    padding-left: 20px;
  }
  
  li {
    font-size: 16px;
    line-height: 1.5;
    color: #495057;
    margin-bottom: 8px;
  }
  
  blockquote {
    border-left: 4px solid #dee2e6;
    padding-left: 16px;
    margin-left: 0;
    color: #6c757d;
  }
  
  @media (max-width: 600px) {
    h1 { font-size: 22px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
  }
`;

const ErrorMessage = styled(Typography)`
  color: #dc3545;
  margin-top: 20px;
`;

export default PolicyScreen;
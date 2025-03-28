import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, 
    faUserMd, 
    faSmile, 
    faCalendarAlt, 
    faBuilding, 
    faGraduationCap,
    faUser
} from '@fortawesome/free-solid-svg-icons';

const KPISection = ({ data, customStyles = {} }) => {
    // Function to map icon string to FontAwesome icon
    const getIcon = (iconName) => {
        switch(iconName) {
            case 'users': return faUsers;
            case 'user-md': return faUserMd;
            case 'smile': return faSmile;
            case 'calendar': return faCalendarAlt;
            case 'building': return faBuilding;
            case 'graduation-cap': return faGraduationCap;
            case 'user': return faUser;
            default: return faSmile;
        }
    };

    return (
        <Grid container spacing={3}>
            {data.map((kpi, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Paper 
                        elevation={2} 
                        sx={{ 
                            padding: '24px', 
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            height: '100%',
                            ...customStyles?.card
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Box 
                                sx={{
                                    width: '48px',
                                    height: '48px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    backgroundColor: '#3B82F6',
                                    color: 'white',
                                    mr: 2,
                                    ...customStyles?.iconContainer
                                }}
                            >
                                <FontAwesomeIcon icon={getIcon(kpi.icon)} size="lg" />
                            </Box>
                            <Typography variant="h7" sx={{ fontWeight: 'bold', color: '#1F2937' }}>
                                {kpi.title}
                            </Typography>
                        </Box>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 'bold', 
                                color: '#3B82F6',
                                textAlign: 'right',
                                mt: 2
                            }}
                        >
                            {kpi.value}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
};

export default KPISection;

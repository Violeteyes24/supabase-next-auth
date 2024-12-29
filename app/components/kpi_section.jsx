import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

const KPISection = ({ data }) => {
    return (
        <Grid container spacing={3}>
            {data.map((kpi, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                    <Paper elevation={3} sx={{ padding: '16px', textAlign: 'center' }}>
                        <Typography variant="h6">{kpi.title}</Typography>
                        <Typography variant="h4" color="primary">
                            {kpi.value}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
};

export default KPISection;

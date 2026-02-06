import { Main, Box, Typography } from '@strapi/design-system';

const HomePage = () => {
  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Typography variant="alpha" as="h1">
          Newsletter
        </Typography>
        <Typography variant="epsilon" textColor="neutral600">
          Manage and send newsletters to subscribers
        </Typography>
      </Box>
    </Main>
  );
};

export { HomePage };

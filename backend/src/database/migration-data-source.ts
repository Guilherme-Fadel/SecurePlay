import { createDatabaseDataSource } from './database.providers';

// CLI de migrações: nunca sincronizar o schema antes da migração explícita.
const dataSource = createDatabaseDataSource();
dataSource.setOptions({ synchronize: false, migrationsRun: false });
export default dataSource;

import mongoose, { Connection } from 'mongoose';
import env from '@app/common/config/env';

/**
 * Database class. Handles MongoDB database connections.
 */
export class DB {
  connection: Connection;

  /**
   * Connects to a MongoDB server and subsequently opens a MongoDB connection
   */
  async connect() {
    const productionOrStagingEnvironment = ['production', 'staging'].includes(
      env.app_env
    );

    await mongoose.connect(env.mongodb_url, {
      maxPoolSize: 10,
      ...(productionOrStagingEnvironment && {
        student: env.mongodb_studentname,
        pass: env.mongodb_password
      })
    });

    this.connection = mongoose.connection;
  }

  /**
   * Closes all connections in the Mongoose connection pool:
   */
  async disconnect() {
    await mongoose.disconnect();
  }
}

export default new DB();

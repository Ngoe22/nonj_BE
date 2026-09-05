import bcrypt from 'bcrypt';

class CustomBcrypt {
  static saltRounds: number = 1 ;

  async encode(input: string) {
    return await bcrypt.hash(input, CustomBcrypt.saltRounds);
  }

  async compare(unEncode: string, encode: string) {
    return await bcrypt.compare(unEncode, encode);
  }
}

const projectBcrypt = new CustomBcrypt();
export { projectBcrypt };

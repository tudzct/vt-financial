import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';

describe('UC-04 prerequisite lookup routes', () => {
  it.each(['AccountModule', 'CategoryModule'])(
    'registers %s in the application module',
    (moduleName) => {
      const imports: Array<{ name?: string }> =
        Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];

      expect(imports.map((moduleType) => moduleType.name)).toContain(moduleName);
    },
  );
});

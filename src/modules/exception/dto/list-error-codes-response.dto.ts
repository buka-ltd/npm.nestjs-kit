import { ListResponseBodyType } from '~/modules/core/converters/list-response-body-type/list-response-body-type'
import { ErrorCodeDefinitionDto } from './error-code-definition.dto'


export class ListErrorCodesResponseDto extends ListResponseBodyType(ErrorCodeDefinitionDto) {}

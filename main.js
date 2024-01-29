const form = document.querySelector('form');
const file = document.querySelector('input[type=file]');
const resultDiv = document.querySelector('#result');
const copy_btn = document.querySelector('#copy');
const theme_btn = document.querySelector('#theme');

let theme = "dark";

theme_btn.addEventListener('click', e => {
    if (theme === "dark"){
        theme = "light";
        document.body.classList.remove("dark");
        document.body.classList.add("light");
    } else {
        theme = "dark";
        document.body.classList.remove("light");
        document.body.classList.add("dark");
    }
});

const reader = new FileReader();

form.addEventListener('submit', e => {
    e.preventDefault();
    let data = new FormData();
    data.append('file', file.files[0]);
    reader.readAsText(file.files[0])
});
reader.onload = function(event) {
    const contents = event.target.result;
    const data = JSON.parse(contents);
    const text = convert_data_to_obsidian(data);

    // Replace all occurrences of "\n" with "<br>" to preserve line breaks
    const formattedText = text.replaceAll('\n', '<br>');

    // Replace all occurrences of "\t" with "&nbsp;&nbsp;&nbsp;&nbsp;" to preserve tab spaces
    const finalText = formattedText.replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;');
    resultDiv.innerHTML = finalText;

    copy_btn.addEventListener('click', e => {
        navigator.clipboard.writeText(text);
    });

};


function convert_data_to_obsidian(JSON_data){
    let text = "";
    for (let i = 0; i < JSON_data.length; i++) {
        let element = JSON_data[i];
        let data =  convert_element_to_obsidian(element);

        if (data !== undefined) {
            text += data;
            text += "\n";
        }
    }

    return text;

}

function convert_element_to_obsidian(element){

    if (element.Type === "Function"){
        return convert_function_to_obsidian(element);
    } else if (element.Type === "BlueprintGeneratedClass"){
        return convert_property_to_obsidian(element);
    } else if (element.Type === "UserDefinedStruct"){
        return convert_structure_to_obsidian(element);
    } else if (element.Type === "UserDefinedEnum"){
        return convert_enum_to_obsidian(element);
    }

}

function convert_function_to_obsidian(data){

    let hasValidChild = false;

    let Param_text = "";
    let ParamReturn_text = "";
    let ParamRef_text = "";
    let ParamRefReturn_text = "";
    let Return_text = "";
    let RefReturn_text = "";
    let Ref_text = "";

    text = "- ";

    text += data.Name

    if (data.hasOwnProperty("ChildProperties")){

        for (let i = 0; i < data.ChildProperties.length; i++) {

            if (!data.ChildProperties[i].hasOwnProperty("PropertyFlags")){
                continue;
            }

            let propertyFlags = data.ChildProperties[i].PropertyFlags;

            let isParam = propertyFlags.includes("Parm");
            let isReturn = propertyFlags.includes("OutParm");
            let isRef = propertyFlags.includes("ReferenceParm");
            
            if (!isParam && !isReturn && !isRef){
                continue;
            }

            hasValidChild = true;

            let child_text = convert_child_property_to_obsidian(data.ChildProperties[i]);

            if (isParam && isReturn && isRef) {
                ParamRefReturn_text += child_text;
                ParamRefReturn_text += "\n";
            }else if (isParam && isReturn) {
                ParamReturn_text += child_text;
                ParamReturn_text += "\n";
            }else if (isParam && isRef) {
                ParamRef_text += child_text;
                ParamRef_text += "\n";
            }else if (isParam) {
                Param_text += child_text;
                Param_text += "\n";
            }else if (isReturn && isRef) {
                RefReturn_text += child_text;
                RefReturn_text += "\n";
            }else if (isReturn) {
                Return_text += child_text;
                Return_text += "\n";
            }else if (isRef) {
                Ref_text += child_text;
                Ref_text += "\n";
            }
        }

    }

    if (hasValidChild){
        if (Param_text != ""){
            text += "\n\t- Parameters:\n";
            text += Param_text;
        }
        if (ParamReturn_text !== ""){
            text += "\n\t- Parameters and Return Value:\n";
            text += ParamReturn_text;
        }
        if (ParamRef_text !== ""){
            text += "\n\t- Parameters and Reference Value:\n";
            text += ParamRef_text;
        }
        if (ParamRefReturn_text !== ""){
            text += "\n\t- Parameters, Return Value and Reference Value:\n";
            text += ParamRefReturn_text;
        }
        if (Return_text !== ""){
            text += "\n\t- Return Value:\n";
            text += Return_text;
        }
        if (RefReturn_text !== ""){
            text += "\n\t- Return Value and Reference Value:\n";
            text += RefReturn_text;
        }
        if (Ref_text !== ""){
            text += "\n\t- Reference Value:\n";
            text += Ref_text;
        }
    }

    return text;
}

function convert_property_to_obsidian(data){

    text += "\n- Properties:";

    let hasProperty = false;
    
    if(data.hasOwnProperty("ChildProperties")){
        for(let i = 0; i < data.ChildProperties.length; i++){
            let child = data.ChildProperties[i];
            
            if (!child.hasOwnProperty("PropertyFlags")) continue;

            let propertyFlags = child.PropertyFlags;

            let isEdit = propertyFlags.includes("Edit");

            if (!isEdit) continue;

            hasProperty = true;

            let child_text = convert_properties_to_obsidian(child);
            text += child_text;

        }
    }
    if (hasProperty){
        return text;
    } else {
        return "\n\t- No Properties for this file!\n";
    }

}

function convert_child_property_to_obsidian(data){
    let text = "\t\t- "

    text += data.Name;
    text += " - "

    // Is Array?
    if (data.Type === "ArrayProperty"){
        text += "Array of "

        const inner = data.Inner;
        
        text = convert_childData_to_obsidian(text, inner);

    } else {
        text = convert_childData_to_obsidian(text, data);
    }

    return text;
}

function convert_childData_to_obsidian(text, data){
    
    // Is enum?
    if (data.Type === "ByteProperty"){
        const Enum = data.Enum;
        // Is custom enum?
        if (Enum.ObjectName.includes("UserDefinedEnum")){
            text += "[["+Enum.ObjectName.replace("UserDefinedEnum'", "").replace("'", "")+"]]";
        } else { // Is engine enum
            text += Enum.ObjectName.replace("Enum'", "").replace("'", "");
        }

    } else if (data.Type === "ClassProperty"){ // Is ClassProperty?

        // Is CustomClass?
        if (data.hasOwnProperty("MetaClass")){
            const Object = data.MetaClass;
            const ObjectPath = Object.ObjectPath;
            
            const CustomObjectPathSplit = ObjectPath.split("/");
            const CustomObjectFullName = CustomObjectPathSplit[CustomObjectPathSplit.length - 1];

            const CustomObjectName = CustomObjectFullName.split(".")[0];

            text += "[["+CustomObjectName+"]]";

        } else { // Is EngineClass
            const object = data.PropertyClass;
            const objectPath = object.ObjectPath;

            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1];
            
            text += objectName;
        }
    }else if (data.Type === "StructProperty"){ // Is StructProperty?
        const object = data.Struct;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("ScriptStruct'", "").replace("'", "");

            text += objectName;
        } else { // Custom Struct
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];
            
            text += "[["+objectName+"]]";
        }
    } else if(data.Type === "ObjectProperty"){
        
        const object = data.PropertyClass;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("Class'", "").replace("'", "");

            text += objectName;
        } else { // Custom Object
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];;
            
            text += "[["+objectName+"]]";
        }
    

    } else { // Other
        text += data.Type.replace("Property", "");
    }

    return text;

}

function convert_properties_to_obsidian(data){

    let text = "\n\t- "

    text += data.Name;
    text += " - "

    // Is Array?
    if (data.Type === "ArrayProperty"){
        text += "Array of "

        const inner = data.Inner;
        
        text = convert_properties_childData_to_obsidian(text, inner);

    } else {
        text = convert_properties_childData_to_obsidian(text, data);
    }

    return text;

}

function convert_properties_childData_to_obsidian(text, data){

    
    // Is enum?
    if (data.Type === "ByteProperty"){
        const Enum = data.Enum;
        // Is custom enum?
        if (Enum.ObjectName.includes("UserDefinedEnum")){
            text += "[["+Enum.ObjectName.replace("UserDefinedEnum'", "").replace("'", "")+"]]";
        } else { // Is engine enum
            text += Enum.ObjectName.replace("Enum'", "").replace("'", "");
        }

    } else if (data.Type === "ClassProperty"){ // Is ClassProperty?

        // Is CustomClass?
        if (data.hasOwnProperty("MetaClass")){
            const Object = data.MetaClass;
            const ObjectPath = Object.ObjectPath;
            
            const CustomObjectPathSplit = ObjectPath.split("/");
            const CustomObjectFullName = CustomObjectPathSplit[CustomObjectPathSplit.length - 1];

            const CustomObjectName = CustomObjectFullName.split(".")[0];

            text += "[["+CustomObjectName+"]]";

        } else { // Is EngineClass
            const object = data.PropertyClass;
            const objectPath = object.ObjectPath;

            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1];
            
            text += objectName;
        }
    }else if (data.Type === "StructProperty"){ // Is StructProperty?
        const object = data.Struct;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("ScriptStruct'", "").replace("'", "");

            text += objectName;
        } else { // Custom Struct
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];
            
            text += "[["+objectName+"]]";
        }
    } else if(data.Type === "ObjectProperty"){
        
        const object = data.PropertyClass;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("Class'", "").replace("'", "");

            text += objectName;
        } else { // Custom Object
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];;
            
            text += "[["+objectName+"]]";
        }
    

    } else { // Other
        text += data.Type.replace("Property", "");
    }

    return text;
}

function convert_structure_to_obsidian(data){

    let text = "\n\t- "

    text += "Properties:";

    for (let i = 0; i < data.ChildProperties.length; i++) {
        let child_text = "\n\t\t- "
        let child = data.ChildProperties[i];
        
        if (!child.hasOwnProperty("PropertyFlags")) continue;

        let propertyFlags = child.PropertyFlags;

        let isEdit = propertyFlags.includes("Edit");

        if (!isEdit) continue;

        child_text += child.Name;
        child_text += " - "

        // Is Array?
        if (child.Type === "ArrayProperty"){
            text += "Array of "

            const inner = child.Inner;
            
            child_text = struct_convert_childData_to_obsidian(child_text, inner);

        } else {
            child_text = struct_convert_childData_to_obsidian(child_text, child);
        }
        text += child_text;

    }

    return text;

}

function convert_enum_to_obsidian(data){
    let text = "\n\t- "

    text += "Properties:";

    const properties = data.Properties;

    const displayName = properties.DisplayNameMap;
    const name = data.Names;

    for (let i in displayName) {

        let key = Object.keys(displayName[i])[0]

        let child_text = "\n\t\t- "
        let child = displayName[i][key];

        child_text += child.SourceString;
        child_text += " - "
        child_text += enum_found_index_with_key(key, name);
        text += child_text;

    }

    return text;
}


function struct_convert_childData_to_obsidian(text, data){
    
    // Is enum?
    if (data.Type === "ByteProperty"){
        const Enum = data.Enum;
        // Is custom enum?
        if (Enum.ObjectName.includes("UserDefinedEnum")){
            text += "[["+Enum.ObjectName.replace("UserDefinedEnum'", "").replace("'", "")+"]]";
        } else { // Is engine enum
            text += Enum.ObjectName.replace("Enum'", "").replace("'", "");
        }

    } else if (data.Type === "ClassProperty"){ // Is ClassProperty?

        // Is CustomClass?
        if (data.hasOwnProperty("MetaClass")){
            const Object = data.MetaClass;
            const ObjectPath = Object.ObjectPath;
            
            const CustomObjectPathSplit = ObjectPath.split("/");
            const CustomObjectFullName = CustomObjectPathSplit[CustomObjectPathSplit.length - 1];

            const CustomObjectName = CustomObjectFullName.split(".")[0];

            text += "[["+CustomObjectName+"]]";

        } else { // Is EngineClass
            const object = data.PropertyClass;
            const objectPath = object.ObjectPath;

            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1];
            
            text += objectName;
        }
    }else if (data.Type === "StructProperty"){ // Is StructProperty?
        const object = data.Struct;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("ScriptStruct'", "").replace("'", "");

            text += objectName;
        } else { // Custom Struct
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];
            
            text += "[["+objectName+"]]";
        }
    } else if(data.Type === "ObjectProperty"){
        
        const object = data.PropertyClass;
        const objectPath = object.ObjectPath;

        if (objectPath.includes("Engine") || objectPath.includes("/Script/")){ // From Engine
            let objectFullName = object.ObjectName;
            let objectName = objectFullName.replace("Class'", "").replace("'", "");

            text += objectName;
        } else { // Custom Object
            const objectPathSplit = objectPath.split("/");
            const objectName = objectPathSplit[objectPathSplit.length - 1].split(".")[0];;
            
            text += "[["+objectName+"]]";
        }
    

    } else { // Other
        text += data.Type.replace("Property", "");
    }

    return text;

}


function enum_found_index_with_key(key, names){

    for (let name in names) {
        if (name.includes(key)){
            return names[name];
        }
    }
    return -1;
}
# $props();
Er en måde vi kan sende variabler ned til et barne komponent.


# $effect();

Den overvåger automatisk tilstande (state), og hvis de ændrer sig – f.eks. at sessionen udløber – så genkører den logikken med det samme. mere specifikt udfører den en metode hvor derived ændrer en værdi baseret på en anden værdi. 

# derived();
Denne værdi er altid bare et resultat af en anden værdi. 

# OnMount();
Kører de ting som bare skal køre en enkelt gang. 

# Writeable
Er en store eller en globalt delt hukommelse - så vi kan gemme state's et sted også påvirker det resten af programmet. Det er smart at bruge til sessions.

# AES-kryptering
Advanced Encryption Standard - er en standard måde at kryptere på som bruges alle vegne. 

# DeriveKey();
Laver masterpassword om til en nøgle som computere har svært ved at knække. PBKDF2: En algoritme der "strækker" dit password. Den gør mit password tager lang tid at gætte hvis der er en der ønsker at brute force det. Salt er en tilfældig klump data vi kommer på enden af kode ordet så det ikke er det samme hver gang men forskelligt med det samme input. 100.000 iterations er den mængde gange som computeren skal køre det igennem blenderen - vi tvinger det til at tage lidt tid.

# encryptPassword();
Enkrypterer de passwords som brugeren ønsker at gemme - IV er tilfældig støj som sørger for at vi ved samme input får forskellige outputs. Salt bruger vi her til at køre derivekey med og gemmer saltbasen for at kunne dekrypterer passwrodet senere.

# decryptPassword();
Dekryptere brugerens passwords. Vi bruger deriveKey() til at lave en nøgle med masterkey og den gemte salt base. 

# supabaseStore();
Callback delen er lidt funky - det er gammeldags express syntaks. Upsert er en abstraktion der er smart og enten indsætter eller opdaterer. 


# NOTES

Session store skal være soleklart
sæt varabler lokalt ved app start
import pandas as pd

df = pd.read_csv('jumbos_data.csv')

ra_nudge = (5.58909697407083 - 5.58908098199169)/24*360
print(ra_nudge)

dec_nudge = (-5.37112430205189 - (-5.37105496490633))
print(dec_nudge)

df.loc[:, "RA"] = df["RA"].apply(lambda x: x-ra_nudge)

df.loc[:, "DEC"] = df["DEC"].apply(lambda x: x-dec_nudge)

print(df)

df.to_csv('jumbos_data_2.csv',index=False)